import { createFileRoute } from '@tanstack/react-router'

import { CampaignPage } from '@/campaign-play/components/campaign-page/campaign-page'

export const Route = createFileRoute('/campaigns/$campaignId/')({
  component: CampaignOverviewPage,
})

function CampaignOverviewPage() {
  const { campaignId } = Route.useParams()

  return <CampaignPage campaignId={campaignId} />
}
