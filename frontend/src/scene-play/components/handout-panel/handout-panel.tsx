import type { ReactNode } from 'react'

import { HandoutPanelBody } from '@/scenario-preparation/components/handout-panel-body/handout-panel-body'
import type { HandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import type { ItemLink } from '@/scenario-preparation/types/Item'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { RevealTrigger } from '@/scene-play/components/reveal-trigger/reveal-trigger'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import type { RevealOpenContext, RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import { recipientsOfSubject } from '@/scene-play/services/revealPresentation'
import { isRevealedToEveryonePresent, revealTargetOf, toRevealStatus } from '@/scene-play/services/subTabGrouping'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'
import { useSidePanelScope } from '@/shared/components/side-panel/side-panel-scope-context'

interface HandoutPanelProps {
  campaignId: string
  handoutId: string
  /** Opens the layout-level reveal dialog; without it the panel shows no "Reveal..." trigger (specs/scene-play/ux.md 21.7). */
  onReveal?: (target: RevealTarget, context: RevealOpenContext) => void
}

/**
 * A Handout on the Active Scene (specs/navigation/ux.md section 3, specs/scene-play/ux.md section 21.7): the host adapter that
 * resolves the Keeper's Active Scene and renders the scene-scoped body with from="active-scene". A Player or a missing
 * Scene shows not-found and sends no Handout request. A Player-facing Handout that has not reached everyone present
 * gains a "Reveal..." trigger and its reveal status line; revealing keeps the panel open.
 */
export function HandoutPanel({ campaignId, handoutId, onReveal }: HandoutPanelProps) {
  const active = useActiveScene(campaignId)
  const keeperScene = active.data?.kind === 'keeper' ? active.data : null

  if (active.data === undefined) {
    return <SidePanelContent kindLabel="Handout" title={null} state="loading" />
  }
  if (keeperScene === null) {
    return <SidePanelContent kindLabel="Handout" title={null} state="not-found" />
  }

  return <HandoutPanelReady campaignId={campaignId} scene={keeperScene} handoutId={handoutId} onReveal={onReveal} />
}

function HandoutPanelReady({
  campaignId,
  scene,
  handoutId,
  onReveal,
}: {
  campaignId: string
  scene: KeeperActiveScene
  handoutId: string
  onReveal: HandoutPanelProps['onReveal']
}) {
  const material = useScene(campaignId, scene.scenarioId, scene.sceneId, true)
  const { titleId } = useSidePanelScope()
  const located = material.data === undefined || material.data === null ? null : locateHandout(material.data, handoutId)
  const found = located?.found ?? null
  const itemLink = located?.itemLink ?? null
  const completed = found === null || isRevealedToEveryonePresent(handoutId, scene.reveals, scene.investigatorsPresent)
  const triggerId = `panel-reveal-trigger-${handoutId}`
  const action = revealActionOf({ found, itemLink, completed, onReveal, triggerId, titleId, scene, handoutId })

  const owner: HandoutOwner =
    itemLink === null ? { type: 'scene', campaignId, scenarioId: scene.scenarioId, sceneId: scene.sceneId } : { type: 'item', campaignId, itemId: itemLink.item.id }
  return (
    <HandoutPanelBody
      owner={owner}
      handoutId={handoutId}
      from="active-scene"
      action={action}
      statusLine={found === null ? null : toRevealStatus(handoutId, scene.reveals, scene.investigatorsPresent)}
    />
  )
}

/** Where the panel's Handout lives: directly on the Scene, or on one of its linked Items. */
function locateHandout(material: Scene, handoutId: string): { found: HandoutSummary | null; itemLink: ItemLink | null } {
  const handout = material.handouts.find((candidate) => candidate.id === handoutId) ?? null
  if (handout !== null) {
    return { found: handout, itemLink: null }
  }
  const itemLink = material.itemLinks.find((candidate) => candidate.item.handouts.some((entry) => entry.id === handoutId)) ?? null
  return { found: itemLink?.item.handouts.find((entry) => entry.id === handoutId) ?? null, itemLink }
}

interface RevealActionOptions {
  found: HandoutSummary | null
  itemLink: ItemLink | null
  completed: boolean
  onReveal: HandoutPanelProps['onReveal']
  triggerId: string
  titleId: string
  scene: KeeperActiveScene
  handoutId: string
}

/** The panel's "Reveal..." trigger for a Player-facing Handout that has not reached everyone present. */
function revealActionOf({ found, itemLink, completed, onReveal, triggerId, titleId, scene, handoutId }: RevealActionOptions): ReactNode {
  if (found === null || found.visibility !== 'PlayerFacing' || onReveal === undefined || completed) {
    return undefined
  }
  return (
    <RevealTrigger
      triggerId={triggerId}
      title={found.title}
      onReveal={() =>
        onReveal(revealTargetOf(itemLink === null ? { type: 'handout', handout: found } : { type: 'itemHandout', link: itemLink, handout: found }, triggerId), {
          alreadyRevealedIds: recipientsOfSubject(scene.reveals, handoutId, scene.investigatorsPresent).map((recipient) => recipient.id),
          // The panel stays open, so a vanished trigger falls back to the panel h2 (21.7 covers entries; a panel has no list).
          fallbackIds: [triggerId, titleId],
        })
      }
    />
  )
}
