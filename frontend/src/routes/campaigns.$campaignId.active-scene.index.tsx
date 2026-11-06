import { createFileRoute } from '@tanstack/react-router'

import { RunTab } from '@/scene-play/components/active-scene-page/active-scene-tabs'
import { sidePanelSearchSchema } from '@/shared/components/side-panel/sidePanelParams'

export const Route = createFileRoute('/campaigns/$campaignId/active-scene/')({
  validateSearch: sidePanelSearchSchema,
  component: RunRoute,
})

/** The Run sub-tab: the Keeper's run view (specs/scene-play/ux.md section 21.3). */
function RunRoute() {
  return <RunTab />
}
