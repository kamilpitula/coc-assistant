import { createFileRoute } from '@tanstack/react-router'

import { HandoutPage } from '@/scenario-preparation/components/handout-page/handout-page'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/$handoutId')({
  component: HandoutRoute,
})

function HandoutRoute() {
  const { campaignId, scenarioId, sceneId, handoutId } = Route.useParams()

  return <HandoutPage campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} handoutId={handoutId} />
}
