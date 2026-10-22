import { createFileRoute } from '@tanstack/react-router'

import { AddHandoutPage } from '@/scenario-preparation/components/add-handout-page/add-handout-page'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/new')({
  component: AddHandoutRoute,
})

function AddHandoutRoute() {
  const { campaignId, scenarioId, sceneId } = Route.useParams()

  return <AddHandoutPage campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
}
