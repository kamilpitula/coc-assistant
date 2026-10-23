import { createFileRoute } from '@tanstack/react-router'

import { SceneHandoutRoute } from '@/scenario-preparation/components/scene-handout-route/scene-handout-route'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/$handoutId')({
  component: HandoutRoute,
})

function HandoutRoute() {
  const { campaignId, scenarioId, sceneId, handoutId } = Route.useParams()

  return <SceneHandoutRoute campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} handoutId={handoutId} />
}
