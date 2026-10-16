import type { WallEntry } from '@/campaign-play/types/WallEntry'

/** Server order: newer instant first, then the larger id. Positive when the first entry is newer. */
function compareNewness(first: WallEntry, second: WallEntry): number {
  const byTime = Date.parse(first.createdAt) - Date.parse(second.createdAt)
  if (byTime !== 0) {
    return byTime
  }

  return first.id.localeCompare(second.id)
}

/**
 * The entries that arrived between two loaded lists (specs/campaign-wall/ux.md section 4.5): not in the previous list
 * and newer than its newest. A removal, an older entry that fills in, and an older page are never new. Nothing is new
 * before a previous list exists; after a fetched empty list, everything is.
 */
export function findNewWallEntries(previous: readonly WallEntry[] | undefined, next: readonly WallEntry[]): WallEntry[] {
  if (previous === undefined) {
    return []
  }

  const known = new Set(previous.map((entry) => entry.id))
  const newest = previous.reduce<WallEntry | undefined>((latest, entry) => (!latest || compareNewness(entry, latest) > 0 ? entry : latest), undefined)
  return next.filter((entry) => !known.has(entry.id) && (newest === undefined || compareNewness(entry, newest) > 0))
}

/** The announcement for entries that arrived together; empty for none. */
export function describeNewWallEntries(entries: readonly WallEntry[]): string {
  if (entries.length === 0) {
    return ''
  }

  const authors = new Set(entries.map((entry) => entry.authorDisplayName))
  if (entries.length === 1) {
    return `New Wall Entry from ${entries[0].authorDisplayName}.`
  }

  return authors.size === 1
    ? `${entries.length} new Wall Entries from ${entries[0].authorDisplayName}.`
    : `${entries.length} new Wall Entries.`
}
