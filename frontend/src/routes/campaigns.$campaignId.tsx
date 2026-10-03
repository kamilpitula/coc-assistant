import { createFileRoute, Outlet } from '@tanstack/react-router'

import { CampaignLiveConnection } from '@/campaign-play/providers/campaign-live-connection'

export const Route = createFileRoute('/campaigns/$campaignId')({
  component: CampaignLayout,
})

/** Every Campaign page shares one live connection, opened here and closed when the user leaves the Campaign. */
function CampaignLayout() {
  const { campaignId } = Route.useParams()

  return (
    <CampaignLiveConnection campaignId={campaignId}>
      <Outlet />
    </CampaignLiveConnection>
  )
}
