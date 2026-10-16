import { describe, expect, it } from 'vitest'

import type { WallEntry } from '@/campaign-play/types/WallEntry'

import { describeNewWallEntries, findNewWallEntries } from './wallEntryAnnouncements'

// specs/campaign-wall/ux.md section 4.5 (WL-UX-14): which entries are new, and the announcement copy.

function entry(id: string, createdAt: string, author = 'Eleanor Hart'): WallEntry {
  return { id, text: `Text ${id}`, visibility: 'Public', createdAt, authorDisplayName: author }
}

const oldest = entry('a', '2026-10-16T18:00:00Z')
const middle = entry('b', '2026-10-16T18:30:00Z')
const newest = entry('c', '2026-10-16T19:00:00Z')

describe('findNewWallEntries', () => {
  it('finds no new entries before there is a previous list', () => {
    expect(findNewWallEntries(undefined, [newest, middle])).toEqual([])
  })

  it('treats every entry as new when the previous fetched list was empty', () => {
    expect(findNewWallEntries([], [newest, middle])).toEqual([newest, middle])
  })

  it('finds an entry that arrives at the top', () => {
    expect(findNewWallEntries([middle, oldest], [newest, middle, oldest])).toEqual([newest])
  })

  it('finds nothing when older pages are appended below the previous entries', () => {
    expect(findNewWallEntries([newest], [newest, middle, oldest])).toEqual([])
  })

  it('finds nothing for a removal, and the older entry that fills in is not new', () => {
    expect(findNewWallEntries([newest, middle], [newest])).toEqual([])
    expect(findNewWallEntries([newest, middle], [newest, oldest])).toEqual([])
  })

  it('finds only the addition when a removal and an addition arrive together', () => {
    const arrival = entry('d', '2026-10-16T19:30:00Z')

    expect(findNewWallEntries([newest, middle], [arrival, middle])).toEqual([arrival])
  })

  it('finds nothing for an entry that is already in the previous list, such as the viewer own post', () => {
    expect(findNewWallEntries([newest, middle], [newest, middle])).toEqual([])
  })

  it('breaks a tie on the same instant by id, like the server order', () => {
    const sameInstant = entry('z', '2026-10-16T19:00:00Z')

    expect(findNewWallEntries([newest], [sameInstant, newest])).toEqual([sameInstant])
  })
})

describe('describeNewWallEntries', () => {
  it('names the author for one entry', () => {
    expect(describeNewWallEntries([newest])).toBe('New Wall Entry from Eleanor Hart.')
  })

  it('counts several entries from one author', () => {
    expect(describeNewWallEntries([newest, middle])).toBe('2 new Wall Entries from Eleanor Hart.')
  })

  it('only counts when several authors posted', () => {
    expect(describeNewWallEntries([newest, entry('d', '2026-10-16T19:10:00Z', 'Ana Ruiz'), middle])).toBe('3 new Wall Entries.')
  })

  it('says nothing for no entries', () => {
    expect(describeNewWallEntries([])).toBe('')
  })
})
