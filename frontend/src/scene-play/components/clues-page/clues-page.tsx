import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useId, useState } from 'react'

import { InvestigatorNotFound } from '@/campaign-play/components/investigator-not-found/investigator-not-found'
import { RevealedContent } from '@/scene-play/components/revealed-content/revealed-content'
import { useCluesRead } from '@/scene-play/hooks/useCluesRead'
import { groupCluesByScene } from '@/scene-play/services/cluesGrouping'
import { formatClueTime, revealKindLabel, UNNAMED_INVESTIGATOR } from '@/scene-play/services/revealPresentation'
import type { Clue, Clues } from '@/scene-play/types/Reveal'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface CluesPageProps {
  campaignId: string
  /** The Investigator whose Clues the Keeper reads; undefined on a Player's own Clues page. */
  investigatorId?: string
}

/**
 * An Investigator's Clues (specs/scene-play/ux.md section 15): everything the Investigator received from the Keeper, grouped by
 * Scene, newest first, each Clue closed until "Show". The Player reads their own; the Keeper reads any Approved Investigator's. The
 * wrong role sees investigator-not-found without any request. The Player's page announces new arrivals politely.
 */
export function CluesPage({ campaignId, investigatorId }: CluesPageProps) {
  const { query, announcement, isKeeperRoute, wrongRole } = useCluesRead(campaignId, investigatorId)

  if (wrongRole) {
    return <InvestigatorNotFound campaignId={campaignId} />
  }
  if (query.isError) {
    return <LoadFailed onRetry={() => void query.refetch()} />
  }
  if (query.data === null) {
    return isKeeperRoute ? <InvestigatorNotFound campaignId={campaignId} /> : <NoClues campaignId={campaignId} />
  }
  if (query.data === undefined) {
    return <Skeleton aria-busy="true" className="h-40 w-full max-w-2xl" />
  }

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        {announcement.message}
      </p>
      <CluesBody campaignId={campaignId} investigatorId={investigatorId} clues={query.data} />
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

function NoClues({ campaignId }: { campaignId: string }) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">No Clues to show</h1>
      <p className="text-sm">You don&apos;t have an Approved Investigator in this Campaign yet.</p>
      <BackLink campaignId={campaignId} />
    </section>
  )
}

function BackLink({ campaignId, investigatorId, name }: { campaignId: string; investigatorId?: string; name?: string }) {
  const className = buttonVariants({ variant: 'link', className: 'self-start px-0' })
  return investigatorId ? (
    <Link to="/campaigns/$campaignId/investigators/$investigatorId" params={{ campaignId, investigatorId }} className={className}>
      <ArrowLeft aria-hidden="true" />
      Back to {name}
    </Link>
  ) : (
    <Link to="/campaigns/$campaignId" params={{ campaignId }} className={className}>
      <ArrowLeft aria-hidden="true" />
      Back to your Campaign
    </Link>
  )
}

interface CluesBodyProps {
  campaignId: string
  investigatorId?: string
  clues: Clues
}

function CluesBody({ campaignId, investigatorId, clues }: CluesBodyProps) {
  const name = clues.investigatorName ?? UNNAMED_INVESTIGATOR
  const groups = groupCluesByScene(clues.clues)

  return (
    <>
      <BackLink campaignId={campaignId} investigatorId={investigatorId} name={name} />
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-2xl font-semibold break-words">{name}&apos;s Clues</h1>
        <p className="text-sm text-muted-foreground">Everything {name} received from the Keeper, newest first.</p>
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{name} hasn&apos;t received any Clues yet.</p>
      ) : (
        groups.map((group) => (
          <SceneGroup key={group.sceneId} campaignId={campaignId} title={group.sceneTitle} clues={group.clues} />
        ))
      )}
    </>
  )
}

function SceneGroup({ campaignId, title, clues }: { campaignId: string; title: string; clues: Clue[] }) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-lg font-semibold break-words">
        {title}
      </h2>
      {clues.map((clue) => (
        <ClueItem key={clue.revealId} campaignId={campaignId} clue={clue} />
      ))}
    </section>
  )
}

function ClueItem({ campaignId, clue }: { campaignId: string; clue: Clue }) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <article aria-labelledby={titleId} className="flex flex-col gap-2 border-t pt-4">
        <h3 id={titleId} className="text-base font-semibold break-words">
          {clue.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {revealKindLabel(clue)} <span aria-hidden="true">&middot;</span> Revealed <time dateTime={clue.revealedAt}>{formatClueTime(clue.revealedAt)}</time>
        </p>
        <div>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" size="sm" aria-label={`${open ? 'Hide' : 'Show'} ${clue.title}`}>
              {open ? 'Hide' : 'Show'}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <RevealedContent campaignId={campaignId} reveal={clue} />
        </CollapsibleContent>
      </article>
    </Collapsible>
  )
}
