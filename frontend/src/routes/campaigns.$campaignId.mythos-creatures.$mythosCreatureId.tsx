import { createFileRoute } from '@tanstack/react-router'

import { MythosCreaturePage } from '@/scenario-preparation/components/mythos-creature-page/mythos-creature-page'

export const Route = createFileRoute('/campaigns/$campaignId/mythos-creatures/$mythosCreatureId')({
  component: MythosCreatureRoute,
})

function MythosCreatureRoute() {
  const { campaignId, mythosCreatureId } = Route.useParams()

  return <MythosCreaturePage campaignId={campaignId} mythosCreatureId={mythosCreatureId} />
}
