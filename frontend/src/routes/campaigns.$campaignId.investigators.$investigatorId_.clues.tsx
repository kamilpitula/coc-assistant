import { createFileRoute } from '@tanstack/react-router'

import { CluesPage } from '@/scene-play/components/clues-page/clues-page'

export const Route = createFileRoute('/campaigns/$campaignId/investigators/$investigatorId_/clues')({
  component: InvestigatorCluesRoute,
})

function InvestigatorCluesRoute() {
  const { campaignId, investigatorId } = Route.useParams()

  return <CluesPage campaignId={campaignId} investigatorId={investigatorId} />
}
