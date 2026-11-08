import { KeeperReferenceSection } from '@/scene-play/components/keeper-reference-section/keeper-reference-section'
import { RevealedSection } from '@/scene-play/components/revealed-section/revealed-section'
import { RunView } from '@/scene-play/components/run-view/run-view'
import { ToRevealSection } from '@/scene-play/components/to-reveal-section/to-reveal-section'
import { revealsToEveryonePresent } from '@/scene-play/services/subTabGrouping'

import { useActiveSceneTab } from './active-scene-tab-context'

/** The Run sub-tab body: the Keeper's run view (specs/scene-play/ux.md section 21.3). */
export function RunTab() {
  const { campaignId, scene, onPresentSaved, onWallEntryAdded, onFinishedMeanwhile } = useActiveSceneTab()

  return <RunView campaignId={campaignId} scene={scene} onPresentSaved={onPresentSaved} onWallEntryAdded={onWallEntryAdded} onFinishedMeanwhile={onFinishedMeanwhile} />
}

/** The "To reveal" sub-tab body (specs/scene-play/ux.md sections 21.4 and 22.1). */
export function ToRevealTab() {
  const { campaignId, scene, onReveal, onGive } = useActiveSceneTab()

  return <ToRevealSection campaignId={campaignId} scene={scene} onReveal={onReveal} onGive={onGive} />
}

/** The "Keeper reference" sub-tab body (specs/scene-play/ux.md sections 21.5 and 22.2). */
export function ReferenceTab() {
  const { campaignId, scene, onGive, onTakeBack } = useActiveSceneTab()

  return <KeeperReferenceSection campaignId={campaignId} scene={scene} onGive={onGive} onTakeBack={onTakeBack} />
}

/** The "Revealed" sub-tab body (specs/scene-play/ux.md section 21.6): only fully revealed subjects. */
export function RevealedTab() {
  const { scene } = useActiveSceneTab()

  return <RevealedSection reveals={revealsToEveryonePresent(scene.reveals, scene.investigatorsPresent)} />
}
