import { createContext, useContext } from 'react'

import type { GiveItemContext, GiveItemRequest } from '@/scene-play/components/give-item-dialog/give-item-dialog'
import type { TakeBackItemContext, TakeBackItemRequest } from '@/scene-play/components/take-back-item-dialog/take-back-item-dialog'
import type { RevealOpenContext, RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'

/** What the Active Scene layout offers the Keeper's sub-tab bodies (specs/scene-play/ux.md section 21.1). */
export interface ActiveSceneTabContextValue {
  campaignId: string
  scene: KeeperActiveScene
  /** Opens the layout-level reveal dialog for the entry's target, with the completion and focus context (21.7). */
  onReveal: (target: RevealTarget, context: RevealOpenContext) => void
  /** Opens the layout-level give dialog for the Item, with the focus context (22.3). */
  onGive: (request: GiveItemRequest, context: GiveItemContext) => void
  /** Opens the layout-level take-back dialog for the Item, with the focus context (22.4). */
  onTakeBack: (request: TakeBackItemRequest, context: TakeBackItemContext) => void
  /** The Investigators present were saved with the number of waiting rolls it cancelled (24.2). */
  onPresentSaved: (cancelledCount: number) => void
  /** A Wall Entry was added from Run, so the page says "Wall Entry added.". */
  onWallEntryAdded: () => void
  /** A present change found the Scene finished, so the page refetches. */
  onFinishedMeanwhile: () => void
  /** A roll was requested, so the page says "{target} roll requested from {names}.". */
  onRollRequested: (message: string) => void
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
