import { createFileRoute } from '@tanstack/react-router'

import { ReferenceTab } from '@/scene-play/components/active-scene-page/active-scene-tabs'
import { sidePanelSearchSchema } from '@/shared/components/side-panel/sidePanelParams'

export const Route = createFileRoute('/campaigns/$campaignId/active-scene/reference')({
  validateSearch: sidePanelSearchSchema,
  component: ReferenceRoute,
})

/** The "Keeper reference" sub-tab: Keeper-only Handouts and entity profiles (specs/scene-play/ux.md section 21.5). */
function ReferenceRoute() {
  return <ReferenceTab />
}
