import { createFileRoute } from '@tanstack/react-router'

import { ActiveScenePage } from '@/scene-play/components/active-scene-page/active-scene-page'

export const Route = createFileRoute('/campaigns/$campaignId/active-scene')({
  component: ActiveSceneRoute,
})

function ActiveSceneRoute() {
  const { campaignId } = Route.useParams()

  return <ActiveScenePage campaignId={campaignId} />
}
