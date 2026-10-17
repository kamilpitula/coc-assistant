import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { NonPlayerEntityNotFound } from '@/scenario-preparation/components/non-player-entity-not-found/non-player-entity-not-found'
import { useHumanNpc } from '@/scenario-preparation/hooks/useNonPlayerEntities'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface HumanNpcPageProps {
  campaignId: string
  humanNpcId: string
}

/** One Human NPC for its Keeper (specs/scenario-preparation/ux.md section 25). A Player gets the not-found page and no request. */
export function HumanNpcPage({ campaignId, humanNpcId }: HumanNpcPageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const humanNpc = useHumanNpc(campaignId, humanNpcId, isKeeper)
  const navigationMessage = useRouterState({ select: (state) => state.location.state.statusMessage })

  if (!isKeeper || humanNpc.data === null) {
    return <NonPlayerEntityNotFound campaignId={campaignId} />
  }

  if (humanNpc.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Human NPC.</p>
        <Button type="button" variant="outline" onClick={() => void humanNpc.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!humanNpc.data) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        to="/campaigns/$campaignId/non-player-entities"
        params={{ campaignId }}
        className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}
      >
        <ArrowLeft aria-hidden="true" />
        Back to Non-Player Entities
      </Link>
      <p role="status" className="text-sm empty:hidden">
        {navigationMessage}
      </p>
      <h1 className="text-2xl font-semibold break-words">{humanNpc.data.name}</h1>
    </div>
  )
}
