import { createFileRoute } from '@tanstack/react-router'

import { RevealedTab } from '@/scene-play/components/active-scene-page/active-scene-tabs'
import { sidePanelSearchSchema } from '@/shared/components/side-panel/sidePanelParams'

export const Route = createFileRoute('/campaigns/$campaignId/active-scene/revealed')({
  validateSearch: sidePanelSearchSchema,
  component: RevealedRoute,
})

/** The Revealed sub-tab: every Reveal in this Scene, newest first (specs/scene-play/ux.md section 21.6). */
function RevealedRoute() {
  return <RevealedTab />
}
