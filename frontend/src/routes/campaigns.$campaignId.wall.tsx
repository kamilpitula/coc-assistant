import { createFileRoute } from '@tanstack/react-router'

import { CampaignWall } from '@/campaign-play/components/campaign-wall/campaign-wall'

export const Route = createFileRoute('/campaigns/$campaignId/wall')({
  component: CampaignWallPage,
})

function CampaignWallPage() {
  const { campaignId } = Route.useParams()

  return <CampaignWall campaignId={campaignId} />
}
