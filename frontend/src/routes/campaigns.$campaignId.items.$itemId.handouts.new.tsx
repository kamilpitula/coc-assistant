import { createFileRoute } from '@tanstack/react-router'

import { ItemHandoutRoute } from '@/scenario-preparation/components/item-handout-route/item-handout-route'

export const Route = createFileRoute('/campaigns/$campaignId/items/$itemId/handouts/new')({
  component: AddItemHandoutRoute,
})

function AddItemHandoutRoute() {
  const { campaignId, itemId } = Route.useParams()

  return <ItemHandoutRoute campaignId={campaignId} itemId={itemId} />
}
