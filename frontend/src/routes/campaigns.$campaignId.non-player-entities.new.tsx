import { createFileRoute } from '@tanstack/react-router'

import { CreateNonPlayerEntityPage } from '@/scenario-preparation/components/create-non-player-entity-page/create-non-player-entity-page'

export const Route = createFileRoute('/campaigns/$campaignId/non-player-entities/new')({
  component: CreateNonPlayerEntityRoute,
})

function CreateNonPlayerEntityRoute() {
  const { campaignId } = Route.useParams()

  return <CreateNonPlayerEntityPage campaignId={campaignId} />
}
