import { createFileRoute } from '@tanstack/react-router'

import { CreateItemPage } from '@/scenario-preparation/components/create-item-page/create-item-page'

export const Route = createFileRoute('/campaigns/$campaignId/items/new')({
  component: CreateItemRoute,
})

function CreateItemRoute() {
  const { campaignId } = Route.useParams()

  return <CreateItemPage campaignId={campaignId} />
}
