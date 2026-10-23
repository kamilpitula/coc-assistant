import { createFileRoute } from '@tanstack/react-router'

import { SceneHandoutRoute } from '@/scenario-preparation/components/scene-handout-route/scene-handout-route'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/new')({
  component: AddHandoutRoute,
})

function AddHandoutRoute() {
  const { campaignId, scenarioId, sceneId } = Route.useParams()

  return <SceneHandoutRoute campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
}
