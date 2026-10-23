import { nameMatches, sortByName } from '@/scenario-preparation/services/nameSearch'
import type { ItemSummary } from '@/scenario-preparation/types/Item'

/**
 * The Items list and the link picker's view of the loaded list (specs/scenario-preparation/ux.md sections 61 and 64.2): the Items
 * whose name contains the search text, case- and accent-insensitively, sorted by name in the viewer's locale and then by id.
 */
export function filterItems(items: ItemSummary[], search: string): ItemSummary[] {
  return sortByName(items.filter((item) => nameMatches(item.name, search)))
}

/** "1 Item." or "{n} Items." (ux.md section 60); empty for no Items. */
export function describeItemCount(items: ItemSummary[]): string {
  if (items.length === 0) {
    return ''
  }
  return `${items.length} ${items.length === 1 ? 'Item' : 'Items'}.`
}

/** "Not linked to a Scene", "Linked to 1 Scene", or "Linked to {n} Scenes" (ux.md section 61). */
export function describeSceneCount(sceneCount: number): string {
  if (sceneCount === 0) {
    return 'Not linked to a Scene'
  }
  return `Linked to ${sceneCount} ${sceneCount === 1 ? 'Scene' : 'Scenes'}`
}
