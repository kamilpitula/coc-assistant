import { createFileRoute } from '@tanstack/react-router'

import { CluesPage } from '@/scene-play/components/clues-page/clues-page'
import { originSearchSchema } from '@/shared/components/back-link/backLinkOrigin'

export const Route = createFileRoute('/campaigns/$campaignId/investigators/$investigatorId_/clues')({
  validateSearch: originSearchSchema,
  component: InvestigatorCluesRoute,
})

function InvestigatorCluesRoute() {
  const { campaignId, investigatorId } = Route.useParams()
  const { from } = Route.useSearch()

  return <CluesPage campaignId={campaignId} investigatorId={investigatorId} from={from} />
}
