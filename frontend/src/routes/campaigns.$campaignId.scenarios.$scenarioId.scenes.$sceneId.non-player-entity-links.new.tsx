import { createFileRoute } from '@tanstack/react-router'

import { LinkNonPlayerEntityPage } from '@/scenario-preparation/components/link-non-player-entity-page/link-non-player-entity-page'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/non-player-entity-links/new')({
  component: LinkNonPlayerEntityRoute,
})

function LinkNonPlayerEntityRoute() {
  const { campaignId, scenarioId, sceneId } = Route.useParams()

  return <LinkNonPlayerEntityPage campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
}
