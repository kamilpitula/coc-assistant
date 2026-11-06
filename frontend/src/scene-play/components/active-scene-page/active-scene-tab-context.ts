import { createContext, useContext } from 'react'

import type { RevealOpenContext, RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'

/** What the Active Scene layout offers the Keeper's sub-tab bodies (specs/scene-play/ux.md section 21.1). */
export interface ActiveSceneTabContextValue {
  campaignId: string
  scene: KeeperActiveScene
  /** Opens the layout-level reveal dialog for the entry's target, with the completion and focus context (21.7). */
  onReveal: (target: RevealTarget, context: RevealOpenContext) => void
  /** The Investigators present were saved, so the page says "Investigators present saved.". */
  onPresentSaved: () => void
  /** A present change found the Scene finished, so the page refetches. */
  onFinishedMeanwhile: () => void
}

export const ActiveSceneTabContext = createContext<ActiveSceneTabContextValue | null>(null)

/** The layout's tab data; every sub-tab body renders inside the provider, so a missing value is a bug. */
export function useActiveSceneTab(): ActiveSceneTabContextValue {
  const value = useContext(ActiveSceneTabContext)
  if (value === null) {
    throw new Error('useActiveSceneTab must be used inside the Active Scene layout')
  }
  return value
}
