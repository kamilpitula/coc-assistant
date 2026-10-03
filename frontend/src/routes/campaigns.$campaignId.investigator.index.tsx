import { createFileRoute } from '@tanstack/react-router'

import { InvestigatorResume } from '@/campaign-play/components/investigator-resume/investigator-resume'

export const Route = createFileRoute('/campaigns/$campaignId/investigator/')({
  component: InvestigatorResumePage,
})

function InvestigatorResumePage() {
  const { campaignId } = Route.useParams()

  return <InvestigatorResume campaignId={campaignId} />
}
