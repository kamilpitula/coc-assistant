/** Lower-cases and strips accents, so "kno" finds "Knott" and "cafe" finds "Cafe". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/**
 * Whether the name contains the search text, case- and accent-insensitively (specs/scenario-preparation/ux.md sections 23 and
 * 61). An empty search matches every name.
 */
export function nameMatches(name: string, search: string): boolean {
  return fold(name).includes(fold(search.trim()))
}

/**
 * Sorts by name in the viewer's locale and then by id, without changing the list it is given. The Collator is made once per
 * call, not per comparison.
 */
export function sortByName<T extends { id: string; name: string }>(items: readonly T[]): T[] {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base' })
  return items.toSorted((left, right) => collator.compare(left.name, right.name) || left.id.localeCompare(right.id))
}
