import { createFileRoute } from '@tanstack/react-router'

import { ItemListPage } from '@/scenario-preparation/components/item-list-page/item-list-page'

export const Route = createFileRoute('/campaigns/$campaignId/items/')({
  component: ItemListRoute,
})

function ItemListRoute() {
  const { campaignId } = Route.useParams()

  return <ItemListPage campaignId={campaignId} />
}
