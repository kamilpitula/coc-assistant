import { createFileRoute } from '@tanstack/react-router'

import { MythosCreaturePage } from '@/scenario-preparation/components/mythos-creature-page/mythos-creature-page'
import { originSearchSchema } from '@/shared/components/back-link/backLinkOrigin'

export const Route = createFileRoute('/campaigns/$campaignId/mythos-creatures/$mythosCreatureId')({
  validateSearch: originSearchSchema,
  component: MythosCreatureRoute,
})

function MythosCreatureRoute() {
  const { campaignId, mythosCreatureId } = Route.useParams()
  const { from } = Route.useSearch()

  return <MythosCreaturePage campaignId={campaignId} mythosCreatureId={mythosCreatureId} from={from} />
}
