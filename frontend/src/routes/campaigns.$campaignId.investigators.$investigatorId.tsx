import { createFileRoute } from '@tanstack/react-router'

import { InvestigatorReview } from '@/campaign-play/components/investigator-review/investigator-review'
import { Header } from '@/shared/components/header/header'

export const Route = createFileRoute('/campaigns/$campaignId/investigators/$investigatorId')({
  component: InvestigatorReviewPage,
})

function InvestigatorReviewPage() {
  const { campaignId, investigatorId } = Route.useParams()

  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1 px-6 py-12 md:px-16">
        <InvestigatorReview campaignId={campaignId} investigatorId={investigatorId} />
      </main>
    </div>
  )
}
