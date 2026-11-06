import { createFileRoute } from '@tanstack/react-router'

import { ToRevealTab } from '@/scene-play/components/active-scene-page/active-scene-tabs'
import { sidePanelSearchSchema } from '@/shared/components/side-panel/sidePanelParams'

export const Route = createFileRoute('/campaigns/$campaignId/active-scene/to-reveal')({
  validateSearch: sidePanelSearchSchema,
  component: ToRevealRoute,
})

/** The "To reveal" sub-tab: Player-facing material that has not reached everyone present (specs/scene-play/ux.md 21.4). */
function ToRevealRoute() {
  return <ToRevealTab />
}
