import { createFileRoute } from '@tanstack/react-router'

import { ItemPage } from '@/scenario-preparation/components/item-page/item-page'

export const Route = createFileRoute('/campaigns/$campaignId/items/$itemId')({
  component: ItemRoute,
})

function ItemRoute() {
  const { campaignId, itemId } = Route.useParams()

  return <ItemPage campaignId={campaignId} itemId={itemId} />
}
