import { createFileRoute } from '@tanstack/react-router'

import { ScenePage } from '@/scenario-preparation/components/scene-page/scene-page'
import { sidePanelSearchSchema } from '@/shared/components/side-panel/sidePanelParams'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/')({
  validateSearch: sidePanelSearchSchema,
  component: SceneRoute,
})

function SceneRoute() {
  const { campaignId, scenarioId, sceneId } = Route.useParams()

  return <ScenePage campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
}
