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
