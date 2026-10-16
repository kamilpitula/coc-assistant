import { describe, expect, it } from 'vitest'

import { isOwnWallEntry, rememberOwnWallEntry } from './ownWallEntries'

describe('own Wall Entries', () => {
  it('recognises an entry this tab added and no other', () => {
    rememberOwnWallEntry('added-here')

    expect(isOwnWallEntry('added-here')).toBe(true)
    expect(isOwnWallEntry('added-elsewhere')).toBe(false)
  })
})
