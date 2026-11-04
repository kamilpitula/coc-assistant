import type { ReactNode, RefObject } from 'react'

import { CluesPanel } from '@/scene-play/components/clues-panel/clues-panel'
import { EntityPanel } from '@/scene-play/components/entity-panel/entity-panel'
import { HandoutPanel } from '@/scene-play/components/handout-panel/handout-panel'
import { RevealPanel } from '@/scene-play/components/reveal-panel/reveal-panel'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import { useSidePanel } from '@/shared/hooks/useSidePanel'
import { SidePanel } from '@/shared/components/side-panel/side-panel'
import type { OpenPanel, PanelType } from '@/shared/components/side-panel/sidePanelParams'

interface ActiveScenePanelProps {
  campaignId: string
  /** The host page h1, for focus return when the opening control is gone. */
  headingRef: RefObject<HTMLHeadingElement | null>
}

/**
 * The Active Scene's side panel (specs/navigation/ux.md section 3, PBI-NAV-002 design record D4): the host maps each
 * panel type to its body. The panel renders once the Active Scene query has loaded (G8).
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

/** Each panel type to its body (PBI-NAV-002 design record D4, Strategy): a new type adds one entry and one body. */
const PANEL_BODIES: Record<PanelType, (campaignId: string, panel: OpenPanel) => ReactNode> = {
  clues: (campaignId, panel) => (panel.type === 'clues' ? <CluesPanel campaignId={campaignId} investigatorId={panel.investigatorId} /> : null),
  entity: (campaignId, panel) => (panel.type === 'entity' ? <EntityPanel campaignId={campaignId} linkId={panel.linkId} /> : null),
  handout: (campaignId, panel) => (panel.type === 'handout' ? <HandoutPanel campaignId={campaignId} handoutId={panel.handoutId} /> : null),
  reveal: (campaignId, panel) => (panel.type === 'reveal' ? <RevealPanel campaignId={campaignId} revealId={panel.revealId} /> : null),
}

function panelBody(campaignId: string, panel: OpenPanel | null) {
  return panel === null ? null : PANEL_BODIES[panel.type](campaignId, panel)
}
