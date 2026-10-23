import { createFileRoute } from '@tanstack/react-router'

import { LinkItemPage } from '@/scenario-preparation/components/link-item-page/link-item-page'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/item-links/new')({
  component: LinkItemRoute,
})

function LinkItemRoute() {
  const { campaignId, scenarioId, sceneId } = Route.useParams()

  return <LinkItemPage campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
}
