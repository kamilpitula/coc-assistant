import { nameMatches, sortByName } from '@/scenario-preparation/services/nameSearch'
import type {
  NonPlayerEntitySummary,
  NonPlayerEntityTypeFilter,
} from '@/scenario-preparation/types/NonPlayerEntity'

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
  return sortByName(items.filter((item) => (type === 'All' || item.type === type) && nameMatches(item.name, search)))
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
