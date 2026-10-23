import { describe, expect, it } from 'vitest'

import { nameMatches, sortByName } from './nameSearch'

// specs/scenario-preparation/ux.md sections 23 and 61: search by name is case- and accent-insensitive; lists sort by name, then id.
describe('nameMatches', () => {
  it('finds a part of the name regardless of case', () => {
    expect(nameMatches('Mr. Knott', 'kno')).toBe(true)
    expect(nameMatches('Mr. Knott', 'KNOTT')).toBe(true)
  })

  it('ignores accents on either side', () => {
    expect(nameMatches('Caf\u00e9 owner', 'cafe')).toBe(true)
    expect(nameMatches('Cafe owner', 'caf\u00e9')).toBe(true)
  })

  it('ignores spaces around the search and matches everything for an empty search', () => {
    expect(nameMatches('Mr. Knott', '  knott ')).toBe(true)
    expect(nameMatches('Mr. Knott', '')).toBe(true)
    expect(nameMatches('Mr. Knott', '   ')).toBe(true)
  })

  it('does not match a name that lacks the text', () => {
    expect(nameMatches('Mr. Knott', 'ghoul')).toBe(false)
  })
})

describe('sortByName', () => {
  it('sorts by name regardless of case and accents, then by id, and leaves the given list alone', () => {
    const items = [
      { id: 'b', name: 'zebra' },
      { id: 'c', name: 'Apple' },
      { id: 'a', name: 'apple' },
      { id: 'd', name: '\u00c9clair' },
    ]

    const sorted = sortByName(items)

    expect(sorted.map((item) => item.id)).toEqual(['a', 'c', 'd', 'b'])
    expect(items.map((item) => item.id)).toEqual(['b', 'c', 'a', 'd'])
  })
})
