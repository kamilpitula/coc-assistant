/** The id of an entry's "Remove" button. */
export function removeWallEntryButtonId(entryId: string): string {
  return `remove-wall-entry-${entryId}`
}

/** Where focus goes once an entry is removed: the following entry's Remove, else the previous one's, else the fallback. */
export function focusTargetAfterRemoval(entries: ReadonlyArray<{ id: string }>, removedId: string, fallbackId: string): string {
  const index = entries.findIndex((entry) => entry.id === removedId)
  const neighbour = entries[index + 1] ?? entries[index - 1]
  return neighbour ? removeWallEntryButtonId(neighbour.id) : fallbackId
}

/**
 * Where focus goes when entries change while a "Remove" button has focus: only when that button's entry is gone
 * (specs/campaign-wall/ux.md section 4.5). Neighbours removed in the same refetch are skipped; null leaves focus alone.
 */
export function focusTargetAfterLiveRemoval(
  previous: ReadonlyArray<{ id: string }>,
  next: ReadonlyArray<{ id: string }>,
  focusedElementId: string | undefined,
  fallbackId: string,
): string | null {
  const nextIds = new Set(next.map((entry) => entry.id))
  const removed = previous.find((entry) => removeWallEntryButtonId(entry.id) === focusedElementId && !nextIds.has(entry.id))
  if (!removed) {
    return null
  }

  const remaining = previous.filter((entry) => entry.id === removed.id || nextIds.has(entry.id))
  return focusTargetAfterRemoval(remaining, removed.id, fallbackId)
}
