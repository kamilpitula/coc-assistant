import { createFileRoute } from '@tanstack/react-router'

import { CreateScenePage } from '@/scenario-preparation/components/create-scene-page/create-scene-page'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/new')({
  component: CreateSceneRoute,
})

function CreateSceneRoute() {
  const { campaignId, scenarioId } = Route.useParams()

  return <CreateScenePage campaignId={campaignId} scenarioId={scenarioId} />
}
