import { KeeperReferenceSection } from '@/scene-play/components/keeper-reference-section/keeper-reference-section'
import { RevealedSection } from '@/scene-play/components/revealed-section/revealed-section'
import { RunView } from '@/scene-play/components/run-view/run-view'
import { ToRevealSection } from '@/scene-play/components/to-reveal-section/to-reveal-section'

import { useActiveSceneTab } from './active-scene-tab-context'

/** The Run sub-tab body: the Keeper's run view (specs/scene-play/ux.md section 21.3). */
export function RunTab() {
  const { campaignId, scene, onPresentSaved, onFinishedMeanwhile } = useActiveSceneTab()

  return <RunView campaignId={campaignId} scene={scene} onPresentSaved={onPresentSaved} onFinishedMeanwhile={onFinishedMeanwhile} />
}

/** The "To reveal" sub-tab body (specs/scene-play/ux.md section 21.4). */
export function ToRevealTab() {
  const { campaignId, scene, onReveal } = useActiveSceneTab()

  return <ToRevealSection campaignId={campaignId} scene={scene} onReveal={onReveal} />
}

/** The "Keeper reference" sub-tab body (specs/scene-play/ux.md section 21.5). */
export function ReferenceTab() {
  const { campaignId, scene } = useActiveSceneTab()

  return <KeeperReferenceSection campaignId={campaignId} scene={scene} />
}

/** The "Revealed" sub-tab body (specs/scene-play/ux.md section 21.6). */
export function RevealedTab() {
  const { scene } = useActiveSceneTab()

  return <RevealedSection reveals={scene.reveals} />
}
