import { createFileRoute } from '@tanstack/react-router'

import { NonPlayerEntityListPage } from '@/scenario-preparation/components/non-player-entity-list-page/non-player-entity-list-page'

export const Route = createFileRoute('/campaigns/$campaignId/non-player-entities/')({
  component: NonPlayerEntityListRoute,
})

function NonPlayerEntityListRoute() {
  const { campaignId } = Route.useParams()

  return <NonPlayerEntityListPage campaignId={campaignId} />
}
