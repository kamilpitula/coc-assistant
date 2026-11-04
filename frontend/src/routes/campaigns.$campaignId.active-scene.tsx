import { createFileRoute } from '@tanstack/react-router'

import { ActiveScenePage } from '@/scene-play/components/active-scene-page/active-scene-page'
import { sidePanelSearchSchema } from '@/shared/components/side-panel/sidePanelParams'

export const Route = createFileRoute('/campaigns/$campaignId/active-scene')({
  validateSearch: sidePanelSearchSchema,
  component: ActiveSceneRoute,
})

function ActiveSceneRoute() {
  const { campaignId } = Route.useParams()

  return <ActiveScenePage campaignId={campaignId} />
}
