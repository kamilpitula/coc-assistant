import { createFileRoute } from '@tanstack/react-router'

import { CampaignSettings } from '@/campaign-play/components/campaign-settings/campaign-settings'

export const Route = createFileRoute('/campaigns/$campaignId/settings')({
  component: CampaignSettingsPage,
})

function CampaignSettingsPage() {
  const { campaignId } = Route.useParams()

  return <CampaignSettings campaignId={campaignId} />
}
