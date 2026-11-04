import type { RefObject } from 'react'

import { CluesPanel } from '@/scene-play/components/clues-panel/clues-panel'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import { useSidePanel } from '@/shared/hooks/useSidePanel'
import { SidePanel } from '@/shared/components/side-panel/side-panel'
import type { OpenPanel } from '@/shared/components/side-panel/sidePanelParams'

interface ActiveScenePanelProps {
  campaignId: string
  /** The host page h1, for focus return when the opening control is gone. */
  headingRef: RefObject<HTMLHeadingElement | null>
}

/**
 * The Active Scene's side panel (specs/navigation/ux.md section 3, PBI-NAV-002 design record D4): the host maps each
 * panel type to its body. The panel renders once the Active Scene query has loaded (G8). The handout, entity, and
 * reveal bodies arrive in phase 4 with PBI-SPL-005/SPL-006; until then their params open nothing.
 */
export function ActiveScenePanel({ campaignId, headingRef }: ActiveScenePanelProps) {
  const active = useActiveScene(campaignId)
  const { panel, close } = useSidePanel()

  if (active.data === undefined) {
    return null
  }

  const body = panelBody(campaignId, panel)

  return (
    <SidePanel open={body !== null} onClose={close} fallbackRef={headingRef}>
      {body}
    </SidePanel>
  )
}

function panelBody(campaignId: string, panel: OpenPanel | null) {
  if (panel?.type !== 'clues') {
    return null
  }

  return <CluesPanel campaignId={campaignId} investigatorId={panel.investigatorId} />
}
