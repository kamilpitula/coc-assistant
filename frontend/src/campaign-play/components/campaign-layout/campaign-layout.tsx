import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { CampaignHeader } from '@/campaign-play/components/campaign-header/campaign-header'
import type { CampaignSection } from '@/campaign-play/services/campaignSection'
import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import { useActiveSceneRollRequests, useMyRequestedRolls } from '@/roll-requests/hooks/useRollRequests'
import { useRequestedRollAnnouncement } from '@/roll-requests/hooks/useRequestedRollAnnouncement'
import type { RollRequest } from '@/roll-requests/types/RollRequest'
import { Header } from '@/shared/components/header/header'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface CampaignLayoutProps {
  campaignId: string
  section: CampaignSection
  isOverview: boolean
  children: ReactNode
}

/**
 * The frame of every Campaign page: the site header, then the Campaign header and the page inside main. Loading,
 * error, and not-found replace both the Campaign header and the page (specs/campaign-overview/ux.md section 2), so
 * pages render only for a loaded Campaign and read it from the same query cache.
 */
export function CampaignLayout({ campaignId, section, isOverview, children }: CampaignLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-6 px-6 py-8 md:px-16">
        <CampaignFrame campaignId={campaignId} section={section} isOverview={isOverview}>
          {children}
        </CampaignFrame>
      </main>
    </div>
  )
}

function CampaignFrame({ campaignId, section, isOverview, children }: CampaignLayoutProps) {
  const campaign = useCampaign(campaignId)
  const activeScene = useActiveScene(campaignId, Boolean(campaign.data))
  const badge = useWaitingRollBadge(campaignId, section, campaign.data?.role === 'Keeper', activeScene.data != null)

  if (campaign.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-11 w-48" />
        <Skeleton className="h-40 w-full max-w-3xl" />
      </div>
    )
  }

  if (campaign.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Campaign.</p>
        <Button type="button" variant="outline" onClick={() => void campaign.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!campaign.data) {
    return <CampaignNotFound />
  }

  return (
    <>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {badge.announcement}
      </div>
      <CampaignHeader
        campaign={campaign.data}
        section={section}
        isOverview={isOverview}
        hasActiveScene={activeScene.data != null}
        waitingRollCount={badge.count}
      />
      {children}
    </>
  )
}

/**
 * The waiting count for the Active Scene tab with the assertive announcement for a Player's new rolls
 * (specs/roll-requests/ux.md sections 7 and 8). The Keeper counts every Waiting roll of the Active Scene, a Player
 * counts their own; both queries stay off until the Campaign, and so the role, has loaded.
 */
function useWaitingRollBadge(campaignId: string, section: CampaignSection, isKeeper: boolean | undefined, hasActiveScene: boolean) {
  const keeperRolls = useActiveSceneRollRequests(campaignId, isKeeper === true)
  const mine = useMyRequestedRolls(campaignId, isKeeper === false)
  // The region is always in the DOM, so it is mounted before any text is placed in it (RR-A11Y-5).
  const announcement = useRequestedRollAnnouncement(
    isKeeper === false ? mine.data?.rolls : undefined,
    isKeeper === false && mine.isFetchedAfterMount,
    mine.data?.investigatorName ?? null,
    section === 'active-scene',
  )

  return { count: waitingRollCount(hasActiveScene, isKeeper, keeperRolls.data, mine.data?.rolls.length), announcement: announcement.message }
}

/** The waiting count for the Active Scene tab: every Waiting roll for the Keeper, the own rolls for a Player. */
function waitingRollCount(
  hasActiveScene: boolean,
  isKeeper: boolean | undefined,
  keeperRequests: RollRequest[] | null | undefined,
  mineCount: number | undefined,
): number | undefined {
  if (!hasActiveScene) {
    return undefined
  }

  if (isKeeper === true) {
    return keeperRequests?.flatMap((request) => request.requestedRolls).filter((roll) => roll.status === 'Waiting').length
  }

  return mineCount
}

/** The Campaign does not exist or the caller is not a member (specs/character-sheet/ux.md section 3.3). */
function CampaignNotFound() {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that Campaign</h1>
      <Link to="/campaigns" className={buttonVariants({ variant: 'link', className: 'px-0' })}>
        Back to Campaigns
      </Link>
    </section>
  )
}
