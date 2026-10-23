import { ITEM_HANDOUT_DELETE_REFUSED, ITEM_HANDOUT_LOCKED, itemInPlayReason } from '@/scenario-preparation/services/itemInPlay'
import type { HandoutOwnerContext } from '@/scenario-preparation/types/HandoutOwnerContext'
import type { Item } from '@/scenario-preparation/types/Item'
import type { Scene } from '@/scenario-preparation/types/Scene'

export const SCENE_FINISHED_SENTENCE = "This Scene is finished and can't be changed."
export const SCENE_STARTED_SENTENCE = "This Scene has been started, so its Handouts can't be deleted."
export const SCENE_STARTED_REFUSAL = "This Scene has been started, so this Handout can't be deleted."

/**
 * What the Handout screens may do with a Scene's Handouts (specs/scenario-preparation/ux.md sections 41 to 44): a Prepared Scene
 * allows every change, an Active Scene everything but a delete, and a Finished Scene nothing.
 */
export function sceneHandoutContext(scene: Scene, refetchOwner: () => void): HandoutOwnerContext {
  const canChange = scene.status !== 'Finished'
  const canDelete = scene.status === 'Prepared'

  let lockedMessage: string | null = null
  if (!canChange) {
    lockedMessage = SCENE_FINISHED_SENTENCE
  } else if (!canDelete) {
    lockedMessage = SCENE_STARTED_SENTENCE
  }

  return {
    ownerLabel: 'Scene',
    ownerName: scene.title,
    backLabel: 'Back to the Scene',
    canChange,
    canDelete,
    lockedMessage,
    deleteRefusedMessage: SCENE_STARTED_REFUSAL,
    refetchOwner,
  }
}

/**
 * What the Handout screens may do with an Item's Handouts (specs/scenario-preparation/ux.md section 65): an Item is never
 * Finished, so every change but a delete is always allowed; a delete is offered only while the Item is not part of a played Scene
 * and not held.
 */
export function itemHandoutContext(item: Item, refetchOwner: () => void): HandoutOwnerContext {
  const reason = itemInPlayReason(item)

  return {
    ownerLabel: 'Item',
    ownerName: item.name,
    backLabel: 'Back to the Item',
    canChange: true,
    canDelete: reason === null,
    lockedMessage: reason === null ? null : ITEM_HANDOUT_LOCKED[reason],
    deleteRefusedMessage: ITEM_HANDOUT_DELETE_REFUSED,
    refetchOwner,
  }
}
