import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/campaigns/$campaignId')({
  component: CampaignLayout,
})

function CampaignLayout() {
  return <Outlet />
}
