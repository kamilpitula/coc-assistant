import { createFileRoute } from '@tanstack/react-router'

import { ItemHandoutRoute } from '@/scenario-preparation/components/item-handout-route/item-handout-route'

export const Route = createFileRoute('/campaigns/$campaignId/items/$itemId/handouts/$handoutId')({
  component: ItemHandoutPageRoute,
})

function ItemHandoutPageRoute() {
  const { campaignId, itemId, handoutId } = Route.useParams()

  return <ItemHandoutRoute campaignId={campaignId} itemId={itemId} handoutId={handoutId} />
}
