import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'

import { CampaignLayout } from '@/campaign-play/components/campaign-layout/campaign-layout'
import { campaignSectionOf, isOverviewRoute } from '@/campaign-play/services/campaignSection'
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
  const leafRouteId = useRouterState({ select: (state) => state.matches.at(-1)?.routeId })
  const section = campaignSectionOf(leafRouteId ?? '')
  const isOverview = leafRouteId !== undefined && isOverviewRoute(leafRouteId)

  return (
    <CampaignLiveConnection campaignId={campaignId}>
      <CampaignLayout campaignId={campaignId} section={section} isOverview={isOverview}>
        <Outlet />
      </CampaignLayout>
    </CampaignLiveConnection>
  )
}
