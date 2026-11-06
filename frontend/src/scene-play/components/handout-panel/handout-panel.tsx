import { HandoutPanelBody } from '@/scenario-preparation/components/handout-panel-body/handout-panel-body'
import type { SceneHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
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
  const handout = material.data?.handouts.find((candidate) => candidate.id === handoutId) ?? null
  const completed = handout === null || isRevealedToEveryonePresent(handoutId, scene.reveals, scene.investigatorsPresent)
  const triggerId = `panel-reveal-trigger-${handoutId}`
  const action =
    handout !== null && handout.visibility === 'PlayerFacing' && onReveal !== undefined && !completed ? (
      <RevealTrigger
        triggerId={triggerId}
        title={handout.title}
        onReveal={() =>
          onReveal(revealTargetOf({ type: 'handout', handout }, triggerId), {
            alreadyRevealedIds: recipientsOfSubject(scene.reveals, handoutId, scene.investigatorsPresent).map((recipient) => recipient.id),
            // The panel stays open, so a vanished trigger falls back to the panel h2 (21.7 covers entries; a panel has no list).
            fallbackIds: [triggerId, titleId],
          })
        }
      />
    ) : undefined

  const owner: SceneHandoutOwner = { type: 'scene', campaignId, scenarioId: scene.scenarioId, sceneId: scene.sceneId }
  return (
    <HandoutPanelBody
      owner={owner}
      handoutId={handoutId}
      from="active-scene"
      action={action}
      statusLine={handout === null ? null : toRevealStatus(handoutId, scene.reveals, scene.investigatorsPresent)}
    />
  )
}
