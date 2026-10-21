import { createFileRoute } from '@tanstack/react-router'

import { ScenePage } from '@/scenario-preparation/components/scene-page/scene-page'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/')({
  component: SceneRoute,
})

function SceneRoute() {
  const { campaignId, scenarioId, sceneId } = Route.useParams()

  return <ScenePage campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
}
