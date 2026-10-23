import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { useItems } from '@/scenario-preparation/hooks/useItems'
import { describeItemCount } from '@/scenario-preparation/services/itemFilter'
import type { ItemSummary } from '@/scenario-preparation/types/Item'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface ItemSummarySectionProps {
  campaignId: string
}

/**
 * The Keeper's "Items" section on the Overview: the count sentence, "View all Items", and "Create" (specs/scenario-preparation/ux.md
 * section 60). Mounted for the Keeper only, so a Player's client never requests the list.
 */
export function ItemSummarySection({ campaignId }: ItemSummarySectionProps) {
  const headingId = useId()
  const list = useItems(campaignId, true)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold">
          Items
        </h2>
        <Link to="/campaigns/$campaignId/items/new" params={{ campaignId }} className={buttonVariants({ size: 'sm' })}>
          Create <span className="sr-only">Item</span>
        </Link>
      </div>
      <SummaryBody campaignId={campaignId} items={list.data} isPending={list.isPending} isError={list.isError} onRetry={() => void list.refetch()} />
    </section>
  )
}

interface SummaryBodyProps {
  campaignId: string
  items: ItemSummary[] | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
}

function SummaryBody({ campaignId, items, isPending, isError, onRetry }: SummaryBodyProps) {
  if (isPending) {
    return <Skeleton aria-busy="true" className="h-5 w-full max-w-sm" />
  }

  if (isError || !items) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">We couldn&apos;t load the Items.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No Items yet.</p>
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <p className="text-sm">{describeItemCount(items)}</p>
      <Link to="/campaigns/$campaignId/items" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'px-0' })}>
        View all Items
      </Link>
    </div>
  )
}
