import type { InfiniteData } from '@tanstack/react-query'

import type { WallEntry, WallEntryPage } from '@/campaign-play/types/WallEntry'

type WallCache = InfiniteData<WallEntryPage, string | undefined>

/** Inserts a just-added entry at the top of the loaded Wall; the cursors still point at the same older entries. */
export function prependWallEntry(cache: WallCache | undefined, entry: WallEntry): WallCache | undefined {
  if (!cache) {
    return cache
  }

  const [first, ...rest] = cache.pages
  return { ...cache, pages: [{ ...first, entries: [entry, ...first.entries] }, ...rest] }
}

/** Takes a removed entry out of the loaded Wall. */
export function withoutWallEntry(cache: WallCache | undefined, entryId: string): WallCache | undefined {
  if (!cache) {
    return cache
  }

  return { ...cache, pages: cache.pages.map((page) => ({ ...page, entries: page.entries.filter((entry) => entry.id !== entryId) })) }
}
