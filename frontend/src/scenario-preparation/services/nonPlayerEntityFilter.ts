import type {
  NonPlayerEntitySummary,
  NonPlayerEntityTypeFilter,
} from '@/scenario-preparation/types/NonPlayerEntity'

/** Lower-cases and strips accents, so "kno" finds "Knott" and "cafe" finds "Cafe". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/**
 * The list page's view of the loaded list (specs/scenario-preparation/ux.md section 23): the entities whose name
 * contains the search text, case- and accent-insensitively, of the chosen type, sorted by name in the viewer's locale
 * and then by id.
 */
export function filterNonPlayerEntities(
  items: NonPlayerEntitySummary[],
  search: string,
  type: NonPlayerEntityTypeFilter,
): NonPlayerEntitySummary[] {
  const needle = fold(search.trim())
  const collator = new Intl.Collator(undefined, { sensitivity: 'base' })

  return items
    .filter((item) => (type === 'All' || item.type === type) && fold(item.name).includes(needle))
    .toSorted((left, right) => collator.compare(left.name, right.name) || left.id.localeCompare(right.id))
}

/** "12 Human NPCs and 5 Mythos Creatures." with singular forms and a zero count left out (ux.md section 22); empty for no entities. */
export function describeCounts(items: NonPlayerEntitySummary[]): string {
  const humans = items.filter((item) => item.type === 'HumanNpc').length
  const creatures = items.length - humans
  const parts = [
    humans > 0 ? `${humans} ${humans === 1 ? 'Human NPC' : 'Human NPCs'}` : null,
    creatures > 0 ? `${creatures} ${creatures === 1 ? 'Mythos Creature' : 'Mythos Creatures'}` : null,
  ].filter((part): part is string => part !== null)

  return parts.length === 0 ? '' : `${parts.join(' and ')}.`
}
