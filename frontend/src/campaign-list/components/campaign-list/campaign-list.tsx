import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useId, useRef } from 'react'

import { CampaignListItem } from '@/campaign-list/components/campaign-list-item/campaign-list-item'
import { useCampaignList } from '@/campaign-list/hooks/useCampaignList'
import type { CampaignListItem as CampaignListItemData } from '@/campaign-list/types/CampaignListItem'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

/**
 * The Campaign List, "Your campaigns" (specs/campaign-list/ux.md sections 2 and 4): the Campaigns the caller runs,
 * then those they play in, in server order. Read-only apart from "New campaign".
 */
export function CampaignList() {
  const campaigns = useCampaignList()
  const headingRef = useRef<HTMLHeadingElement>(null)

  // After a successful retry the error alert is gone, so focus moves to the heading instead of being lost.
  const retry = async () => {
    const result = await campaigns.refetch()
    if (result.isSuccess) {
      headingRef.current?.focus()
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold focus-visible:outline-none">
          Your campaigns
        </h1>
        <NewCampaignLink />
      </div>
      <CampaignListBody campaigns={campaigns} onRetry={() => void retry()} />
    </div>
  )
}

interface CampaignListBodyProps {
  campaigns: ReturnType<typeof useCampaignList>
  onRetry: () => void
}

function CampaignListBody({ campaigns, onRetry }: CampaignListBodyProps) {
  if (campaigns.isPending) {
    return <LoadingCard />
  }
  if (campaigns.isError) {
    return <LoadError isRetrying={campaigns.isFetching} onRetry={onRetry} />
  }
  const items = campaigns.data ?? []
  if (items.length === 0) {
    return <EmptyCard />
  }
  return (
    <>
      <CampaignSection heading="You run" items={items.filter((item) => item.role === 'Keeper')} />
      <CampaignSection heading="You play in" items={items.filter((item) => item.role === 'Player')} />
    </>
  )
}

function NewCampaignLink() {
  return (
    <Link to="/campaigns/new" className={buttonVariants()}>
      <Plus aria-hidden="true" />
      New campaign
    </Link>
  )
}

function CampaignSection({ heading, items }: { heading: string; items: CampaignListItemData[] }) {
  const headingId = useId()

  if (items.length === 0) {
    return null
  }
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-lg font-semibold">
        {heading}
      </h2>
      <Card className="overflow-hidden">
        <ul className="divide-y">
          {items.map((item) => (
            <CampaignListItem key={item.id} item={item} />
          ))}
        </ul>
      </Card>
    </section>
  )
}

function LoadingCard() {
  return (
    <Card aria-busy="true">
      <ul className="divide-y" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <li key={index} className="flex flex-col gap-2 px-4 py-3">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48" />
          </li>
        ))}
      </ul>
    </Card>
  )
}

function LoadError({ isRetrying, onRetry }: { isRetrying: boolean; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="text-sm">We couldn&apos;t load your campaigns.</p>
      <Button type="button" variant="outline" disabled={isRetrying} onClick={onRetry}>
        {isRetrying ? 'Trying again...' : 'Try again'}
      </Button>
    </div>
  )
}

function EmptyCard() {
  const headingId = useId()

  return (
    <Card>
      <section aria-labelledby={headingId} className="flex flex-col items-start gap-3 p-6">
        <h2 id={headingId} className="text-lg font-semibold">
          No campaigns yet
        </h2>
        <p className="text-sm">
          To join a Campaign, open the invite link your Keeper sent you. To run your own, start a new one.
        </p>
        <NewCampaignLink />
      </section>
    </Card>
  )
}
