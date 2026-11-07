import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { useOriginBackLink } from '@/campaign-play/hooks/useOriginBackLink'
import { InvestigatorNotFound } from '@/campaign-play/components/investigator-not-found/investigator-not-found'
import { CluesList } from '@/scene-play/components/clues-list/clues-list'
import { HeldItemsSection } from '@/scene-play/components/held-items-section/held-items-section'
import { useCluesRead } from '@/scene-play/hooks/useCluesRead'
import { UNNAMED_INVESTIGATOR } from '@/scene-play/services/revealPresentation'
import type { Clues } from '@/scene-play/types/Reveal'
import { BackLink } from '@/shared/components/back-link/back-link'
import type { BackLinkTarget } from '@/shared/components/back-link/backLinkOrigin'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface CluesPageProps {
  campaignId: string
  /** The Investigator whose Clues the Keeper reads; undefined on a Player's own Clues page. */
  investigatorId?: string
  /** Where the viewer came from; an allow-listed origin replaces the structural back link (specs/navigation/ux.md section 4). */
  from?: string
}

/**
 * An Investigator's Clues (specs/scene-play/ux.md section 15): everything the Investigator received from the Keeper, grouped by
 * Scene, newest first, each Clue closed until "Show". The Player reads their own; the Keeper reads any Approved Investigator's. The
 * wrong role sees investigator-not-found without any request. The Player's page announces new arrivals politely.
 */
export function CluesPage({ campaignId, investigatorId, from }: CluesPageProps) {
  const { query, announcement, isKeeperRoute, wrongRole } = useCluesRead(campaignId, investigatorId)

  if (wrongRole) {
    return <InvestigatorNotFound campaignId={campaignId} />
  }
  if (query.isError) {
    return <LoadFailed onRetry={() => void query.refetch()} />
  }
  if (query.data === null) {
    return isKeeperRoute ? <InvestigatorNotFound campaignId={campaignId} /> : <NoClues campaignId={campaignId} from={from} />
  }
  if (query.data === undefined) {
    return <Skeleton aria-busy="true" className="h-40 w-full max-w-2xl" />
  }

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        {announcement.message}
      </p>
      <CluesBody campaignId={campaignId} investigatorId={investigatorId} clues={query.data} from={from} />
    </div>
  )
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm">We couldn&apos;t load the Clues.</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

function NoClues({ campaignId, from }: { campaignId: string; from?: string }) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">No Clues to show</h1>
      <p className="text-sm">You don&apos;t have an Approved Investigator in this Campaign yet.</p>
      <CluesBackLink campaignId={campaignId} from={from} />
    </section>
  )
}

function CluesBackLink({ campaignId, investigatorId, name, from }: { campaignId: string; investigatorId?: string; name?: string; from?: string }) {
  const originLabel = useOriginBackLink(campaignId)
  // Annotated so each branch checks fresh against the target (a bare ternary normalizes the union with an
  // `investigatorId?: undefined` member, which the index signature rejects); both branches carry only strings.
  const fallback: BackLinkTarget =
    investigatorId === undefined
      ? { label: 'your Campaign', to: '/campaigns/$campaignId' as const, params: { campaignId } }
      : { label: name ?? UNNAMED_INVESTIGATOR, to: '/campaigns/$campaignId/investigators/$investigatorId' as const, params: { campaignId, investigatorId } }

  return (
    <BackLink
      from={from}
      fallback={fallback}
      originTargets={{ 'active-scene': { label: originLabel, to: '/campaigns/$campaignId/active-scene' as const, params: { campaignId } } }}
      render={(target) => (
        <Link to={target.to} params={target.params} className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}>
          <ArrowLeft aria-hidden="true" />
          Back to {target.label}
        </Link>
      )}
    />
  )
}

interface CluesBodyProps {
  campaignId: string
  investigatorId?: string
  clues: Clues
  from?: string
}

function CluesBody({ campaignId, investigatorId, clues, from }: CluesBodyProps) {
  const name = clues.investigatorName ?? UNNAMED_INVESTIGATOR

  return (
    <>
      <CluesBackLink campaignId={campaignId} investigatorId={investigatorId} name={name} from={from} />
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-2xl font-semibold break-words">{name}&apos;s Clues</h1>
        <p className="text-sm text-muted-foreground">Everything {name} received from the Keeper, newest first.</p>
      </div>
      <HeldItemsSection campaignId={campaignId} investigatorId={investigatorId} />
      <CluesList campaignId={campaignId} clues={clues} />
    </>
  )
}
