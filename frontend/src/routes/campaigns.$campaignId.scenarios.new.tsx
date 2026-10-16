import { createFileRoute } from '@tanstack/react-router'

import { CreateScenarioPage } from '@/scenario-preparation/components/create-scenario-page/create-scenario-page'

export const Route = createFileRoute('/campaigns/$campaignId/scenarios/new')({
  component: CreateScenarioRoute,
})

function CreateScenarioRoute() {
  const { campaignId } = Route.useParams()

  return <CreateScenarioPage campaignId={campaignId} />
}
