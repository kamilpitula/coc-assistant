import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router'

import { CampaignLayout } from '@/campaign-play/components/campaign-layout/campaign-layout'
import { CampaignLiveConnection } from '@/campaign-play/providers/campaign-live-connection'

export const Route = createFileRoute('/campaigns/$campaignId')({
  component: CampaignLayoutRoute,
})

/**
 * Every Campaign page shares one live connection, opened here and closed when the user leaves the Campaign, and the
 * Campaign header (specs/campaign-overview/ux.md section 2). Sheet, wizard, and review pages belong to the overview.
 */
function CampaignLayoutRoute() {
  const { campaignId } = Route.useParams()
  const matchRoute = useMatchRoute()
  const isOverview = Boolean(matchRoute({ to: '/campaigns/$campaignId', params: { campaignId } }))
  const isSettings = Boolean(matchRoute({ to: '/campaigns/$campaignId/settings', params: { campaignId } }))

  return (
    <CampaignLiveConnection campaignId={campaignId}>
      <CampaignLayout campaignId={campaignId} section={isSettings ? 'settings' : 'overview'} isOverview={isOverview}>
        <Outlet />
      </CampaignLayout>
    </CampaignLiveConnection>
  )
}
