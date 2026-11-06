import { EntityPanelBody } from '@/scenario-preparation/components/entity-panel-body/entity-panel-body'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { RevealTrigger } from '@/scene-play/components/reveal-trigger/reveal-trigger'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import type { RevealOpenContext, RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import { recipientsOfSubject } from '@/scene-play/services/revealPresentation'
import { isRevealedToEveryonePresent, revealTargetOf, toRevealStatus } from '@/scene-play/services/subTabGrouping'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'
import { useSidePanelScope } from '@/shared/components/side-panel/side-panel-scope-context'

interface EntityPanelProps {
  campaignId: string
  linkId: string
  /** Opens the layout-level reveal dialog; without it the panel shows no "Reveal..." trigger (specs/scene-play/ux.md 21.7). */
  onReveal?: (target: RevealTarget, context: RevealOpenContext) => void
}

/**
 * A Scene's Non-Player Entity on the Active Scene (specs/navigation/ux.md section 3, specs/scene-play/ux.md section 21.7):
 * the host adapter that resolves the Keeper's Active Scene and renders the scene-scoped body with from="active-scene".
 * A Player or a missing Scene shows not-found and sends no Scene or profile request. A link that has not reached
 * everyone present gains a "Reveal..." trigger and its reveal status line; revealing keeps the panel open.
 */
export function EntityPanel({ campaignId, linkId, onReveal }: EntityPanelProps) {
  const active = useActiveScene(campaignId)
  const keeperScene = active.data?.kind === 'keeper' ? active.data : null

  if (active.data === undefined) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="loading" />
  }
  if (keeperScene === null) {
    return <SidePanelContent kindLabel="Non-Player Entity" title={null} state="not-found" />
  }

  return <EntityPanelReady campaignId={campaignId} scene={keeperScene} linkId={linkId} onReveal={onReveal} />
}

function EntityPanelReady({
  campaignId,
  scene,
  linkId,
  onReveal,
}: {
  campaignId: string
  scene: KeeperActiveScene
  linkId: string
  onReveal: EntityPanelProps['onReveal']
}) {
  const material = useScene(campaignId, scene.scenarioId, scene.sceneId, true)
  const { titleId } = useSidePanelScope()
  const link = material.data?.nonPlayerEntityLinks.find((candidate) => candidate.id === linkId) ?? null
  const completed = link === null || isRevealedToEveryonePresent(linkId, scene.reveals, scene.investigatorsPresent)
  const triggerId = `panel-reveal-trigger-${linkId}`
  const action =
    link !== null && onReveal !== undefined && !completed ? (
      <RevealTrigger
        triggerId={triggerId}
        title={link.playerFacingName}
        onReveal={() =>
          onReveal(revealTargetOf({ type: 'entity', link }, triggerId), {
            alreadyRevealedIds: recipientsOfSubject(scene.reveals, linkId, scene.investigatorsPresent).map((recipient) => recipient.id),
            // The panel stays open, so a vanished trigger falls back to the panel h2 (21.7 covers entries; a panel has no list).
            fallbackIds: [triggerId, titleId],
          })
        }
      />
    ) : undefined

  return (
    <EntityPanelBody
      campaignId={campaignId}
      scenarioId={scene.scenarioId}
      sceneId={scene.sceneId}
      linkId={linkId}
      from="active-scene"
      action={action}
      statusLine={link === null ? null : toRevealStatus(linkId, scene.reveals, scene.investigatorsPresent)}
    />
  )
}
