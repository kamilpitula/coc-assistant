import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import { AddHandoutPage } from '@/scenario-preparation/components/add-handout-page/add-handout-page'
import { HandoutPage } from '@/scenario-preparation/components/handout-page/handout-page'
import { ItemNotFound } from '@/scenario-preparation/components/item-not-found/item-not-found'
import { useItemHandoutContext } from '@/scenario-preparation/hooks/useItemHandoutContext'
import type { ItemHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface ItemHandoutRouteProps {
  campaignId: string
  itemId: string
  /** The Handout to show; without one the page adds a Handout. */
  handoutId?: string
}

/**
 * The Handout pages of an Item: loads the Item, turns it into what the Handout screens need to know, and shows the Handout or
 * the "Add Handout" page. A Player and an unknown Item get the Item not-found page and make no request (ux.md section 65).
 */
export function ItemHandoutRoute({ campaignId, itemId, handoutId }: ItemHandoutRouteProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const owner: ItemHandoutOwner = { type: 'item', campaignId, itemId }
  const { item, context } = useItemHandoutContext(owner, isKeeper)

  if (!isKeeper || item.data === null) {
    return <ItemNotFound campaignId={campaignId} />
  }

  if (item.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this {handoutId ? 'Handout' : 'Item'}.</p>
        <Button type="button" variant="outline" onClick={() => void item.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!context) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return handoutId ? (
    <HandoutPage owner={owner} handoutId={handoutId} context={context} />
  ) : (
    <AddHandoutPage owner={owner} context={context} ownerNotFound={<ItemNotFound campaignId={campaignId} />} />
  )
}
