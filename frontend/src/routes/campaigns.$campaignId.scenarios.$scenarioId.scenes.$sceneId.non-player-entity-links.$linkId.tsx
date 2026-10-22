import { createFileRoute } from '@tanstack/react-router'

import { EditNonPlayerEntityLinkPage } from '@/scenario-preparation/components/edit-non-player-entity-link-page/edit-non-player-entity-link-page'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/non-player-entity-links/$linkId')({
  component: EditNonPlayerEntityLinkRoute,
})

function EditNonPlayerEntityLinkRoute() {
  const { campaignId, scenarioId, sceneId, linkId } = Route.useParams()

  return <EditNonPlayerEntityLinkPage campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} linkId={linkId} />
}
