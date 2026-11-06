import { ItemPanelBody } from '@/scenario-preparation/components/item-panel-body/item-panel-body'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { RevealTrigger } from '@/scene-play/components/reveal-trigger/reveal-trigger'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import type { RevealOpenContext, RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import { recipientsOfSubject } from '@/scene-play/services/revealPresentation'
import { isRevealedToEveryonePresent, revealTargetOf } from '@/scene-play/services/subTabGrouping'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'
import { useSidePanelScope } from '@/shared/components/side-panel/side-panel-scope-context'

interface ItemPanelProps {
  campaignId: string
  itemId: string
  /** Opens the layout-level reveal dialog; without it the panel shows no "Reveal..." trigger (specs/scene-play/ux.md 22.5). */
  onReveal?: (target: RevealTarget, context: RevealOpenContext) => void
}

/**
 * An Item on the Active Scene (specs/navigation/ux.md section 3, specs/scene-play/ux.md 22.5): the host adapter that
 * resolves the Keeper's Active Scene and renders the item body with from="active-scene". A Player or a missing Scene
 * shows not-found and sends no Scene or Item request. A linked Item that has not reached everyone present gains a
 * "Reveal..." trigger; revealing keeps the panel open.
 */
export function ItemPanel({ campaignId, itemId, onReveal }: ItemPanelProps) {
  const active = useActiveScene(campaignId)
  const keeperScene = active.data?.kind === 'keeper' ? active.data : null

  if (active.data === undefined) {
    return <SidePanelContent kindLabel="Item" title={null} state="loading" />
  }
  if (keeperScene === null) {
    return <SidePanelContent kindLabel="Item" title={null} state="not-found" />
  }

  return <ItemPanelReady campaignId={campaignId} scene={keeperScene} itemId={itemId} onReveal={onReveal} />
}

function ItemPanelReady({
  campaignId,
  scene,
  itemId,
  onReveal,
}: {
  campaignId: string
  scene: KeeperActiveScene
  itemId: string
  onReveal: ItemPanelProps['onReveal']
}) {
  const material = useScene(campaignId, scene.scenarioId, scene.sceneId, true)
  const { titleId } = useSidePanelScope()
  const link = material.data?.itemLinks.find((candidate) => candidate.item.id === itemId) ?? null
  const completed = link === null || isRevealedToEveryonePresent(link.item.id, scene.reveals, scene.investigatorsPresent)
  const triggerId = `panel-reveal-trigger-${itemId}`
  const action =
    link !== null && onReveal !== undefined && !completed ? (
      <RevealTrigger
        triggerId={triggerId}
        title={link.item.name}
        onReveal={() =>
          onReveal(revealTargetOf({ type: 'item', link }, triggerId), {
            alreadyRevealedIds: recipientsOfSubject(scene.reveals, link.item.id, scene.investigatorsPresent).map(
              (recipient) => recipient.id,
            ),
            // The panel stays open, so a vanished trigger falls back to the panel h2 (21.7 covers entries; a panel has no list).
            fallbackIds: [triggerId, titleId],
          })
        }
      />
    ) : undefined

  return <ItemPanelBody campaignId={campaignId} itemId={itemId} from="active-scene" action={action} />
}
