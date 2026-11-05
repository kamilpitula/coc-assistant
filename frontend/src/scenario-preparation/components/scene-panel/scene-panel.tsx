import type { ReactNode, RefObject } from 'react'

import { EntityPanelBody } from '@/scenario-preparation/components/entity-panel-body/entity-panel-body'
import { HandoutPanelBody } from '@/scenario-preparation/components/handout-panel-body/handout-panel-body'
import type { SceneHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { useSidePanel } from '@/shared/hooks/useSidePanel'
import { SidePanel } from '@/shared/components/side-panel/side-panel'
import type { OpenPanel, PanelType } from '@/shared/components/side-panel/sidePanelParams'

interface ScenePanelProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  /** The host page h1, for focus return when the opening control is gone. */
  headingRef: RefObject<HTMLHeadingElement | null>
}

/**
 * The Scene page's side panel (specs/navigation/ux.md section 3): the host maps its panel types to bodies. `handout`
 * and `entity` render the scene-scoped bodies with no `from`, so full pages show their structural back links. `clues`
 * and `reveal` open no panel; a body without a `from` has no "Reveal..." action.
 */
export function ScenePanel({ campaignId, scenarioId, sceneId, headingRef }: ScenePanelProps) {
  const { panel, close } = useSidePanel()

  const body = panelBody(campaignId, scenarioId, sceneId, panel)

  return (
    <SidePanel open={body !== null} onClose={close} fallbackRef={headingRef}>
      {body}
    </SidePanel>
  )
}

/** Each panel type to its body (PBI-NAV-002 design record D4, Strategy): a new type adds one entry and one body. */
const PANEL_BODIES: Record<
  PanelType,
  (campaignId: string, scenarioId: string, sceneId: string, panel: OpenPanel) => ReactNode
> = {
  clues: () => null,
  entity: (campaignId, scenarioId, sceneId, panel) =>
    panel.type === 'entity' ? (
      <EntityPanelBody campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} linkId={panel.linkId} />
    ) : null,
  handout: (campaignId, scenarioId, sceneId, panel) => {
    if (panel.type !== 'handout') {
      return null
    }
    const owner: SceneHandoutOwner = { type: 'scene', campaignId, scenarioId, sceneId }
    return <HandoutPanelBody owner={owner} handoutId={panel.handoutId} />
  },
  reveal: () => null,
}

function panelBody(campaignId: string, scenarioId: string, sceneId: string, panel: OpenPanel | null) {
  return panel === null ? null : PANEL_BODIES[panel.type](campaignId, scenarioId, sceneId, panel)
}
