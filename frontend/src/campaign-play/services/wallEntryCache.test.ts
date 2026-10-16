import { describe, expect, it } from 'vitest'

import type { WallEntry } from '@/campaign-play/types/WallEntry'

import { prependWallEntry, withoutWallEntry } from './wallEntryCache'

// specs/campaign-wall/ux.md section 4.2 and 4.3: a new entry is inserted at the top, a removed one leaves the list.
function entry(id: string): WallEntry {
  return { id, text: id, visibility: 'Public', createdAt: '2026-10-16T19:02:00Z', authorDisplayName: 'Eleanor Hart' }
}

const cache = {
  pages: [
    { entries: [entry('a'), entry('b')], nextCursor: 'c1' },
    { entries: [entry('c')], nextCursor: null },
  ],
  pageParams: [undefined, 'c1'],
}

describe('wall entry cache', () => {
  it('puts a new entry at the top of the first page and leaves the cursors alone', () => {
    const updated = prependWallEntry(cache, entry('new'))

    expect(updated?.pages.map((page) => page.entries.map((item) => item.id))).toEqual([['new', 'a', 'b'], ['c']])
    expect(updated?.pages.map((page) => page.nextCursor)).toEqual(['c1', null])
  })

  it('leaves an unloaded Wall alone', () => {
    expect(prependWallEntry(undefined, entry('new'))).toBeUndefined()
    expect(withoutWallEntry(undefined, 'a')).toBeUndefined()
  })

  it('takes a removed entry out of whichever page holds it', () => {
    const updated = withoutWallEntry(cache, 'c')

    expect(updated?.pages.map((page) => page.entries.map((item) => item.id))).toEqual([['a', 'b'], []])
  })
})
