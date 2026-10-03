import { createFileRoute } from '@tanstack/react-router'

import { InvestigatorReview } from '@/campaign-play/components/investigator-review/investigator-review'

export const Route = createFileRoute('/campaigns/$campaignId/investigators/$investigatorId')({
  component: InvestigatorReviewPage,
})

function InvestigatorReviewPage() {
  const { campaignId, investigatorId } = Route.useParams()

  return <InvestigatorReview campaignId={campaignId} investigatorId={investigatorId} />
}
