import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/campaigns')({
  component: CampaignsLayout,
})

function CampaignsLayout() {
  return <Outlet />
}
