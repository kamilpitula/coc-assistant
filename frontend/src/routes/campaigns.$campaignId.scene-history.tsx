import { createFileRoute } from '@tanstack/react-router'

import { SceneHistoryPage } from '@/scene-play/components/scene-history-page/scene-history-page'

export const Route = createFileRoute('/campaigns/$campaignId/scene-history')({
  component: SceneHistoryPageRoute,
})

function SceneHistoryPageRoute() {
  const { campaignId } = Route.useParams()

  return <SceneHistoryPage campaignId={campaignId} />
}
