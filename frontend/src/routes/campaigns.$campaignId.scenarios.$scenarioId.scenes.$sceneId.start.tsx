import { createFileRoute } from '@tanstack/react-router'

import { StartScenePage } from '@/scene-play/components/start-scene-page/start-scene-page'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/start')({
  component: StartSceneRoute,
})

function StartSceneRoute() {
  const { campaignId, scenarioId, sceneId } = Route.useParams()

  return <StartScenePage campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
}
