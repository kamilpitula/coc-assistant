import { createFileRoute } from '@tanstack/react-router'

import { ScenarioPage } from '@/scenario-preparation/components/scenario-page/scenario-page'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/$scenarioId')({
  component: ScenarioRoute,
})

function ScenarioRoute() {
  const { campaignId, scenarioId } = Route.useParams()

  return <ScenarioPage campaignId={campaignId} scenarioId={scenarioId} />
}
