import type { Item, ItemInPlayReason } from '@/scenario-preparation/types/Item'

/**
 * Why an Item can not be deleted, nor lose a Handout: a Scene that links it is Active or Finished ("part of a Scene that has been
 * played"), or an Investigator holds it. Null when it is in neither case. "In play" is a design and code term only; the UI never
 * says it (design record PBI-SP-008, D5; specs/scenario-preparation/ux.md section 59).
 */
export function itemInPlayReason(item: Pick<Item, 'scenes'> & { holder: object | null }): ItemInPlayReason | null {
  if (item.scenes.some((scene) => scene.status !== 'Prepared')) {
    return 'played'
  }
  return item.holder === null ? null : 'held'
}

export const isItemInPlay = (item: Pick<Item, 'scenes'> & { holder: object | null }): boolean => itemInPlayReason(item) !== null

/** What the delete dialog says when the Item can not be deleted (ux.md section 63.3). */
export function itemDeleteRefusal(name: string, reason: ItemInPlayReason): string {
  return reason === 'held'
    ? `${name} is held by an Investigator, so it can't be deleted.`
    : `${name} is part of a Scene that has been played, so it can't be deleted.`
}

/** The sentence that replaces "Delete Handout" on the Handout page of an Item that is in play (ux.md section 65). */
export const ITEM_HANDOUT_LOCKED: Record<ItemInPlayReason, string> = {
  played: "This Item is part of a Scene that has been played, so its Handouts can't be deleted.",
  held: "This Item is held by an Investigator, so its Handouts can't be deleted.",
}

/** What the Handout delete dialog says when the server refuses because the Item has come into play meanwhile (ux.md section 65). */
export const ITEM_HANDOUT_DELETE_REFUSED = "This Item is now part of a Scene that has been played, so this Handout can't be deleted."
