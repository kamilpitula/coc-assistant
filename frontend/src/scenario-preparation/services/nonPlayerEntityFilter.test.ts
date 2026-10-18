import { describe, expect, it } from 'vitest'

import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'

import { describeCounts, filterNonPlayerEntities } from './nonPlayerEntityFilter'

// specs/scenario-preparation/ux.md sections 22 and 23; SP-UX-28, SP-UX-29, SP-UX-30.

// "e" with an acute accent, built from its code point so the source stays ASCII.
const eAcute = String.fromCodePoint(0xe9)

const knott: NonPlayerEntitySummary = { id: 'b', type: 'HumanNpc', name: 'Mr. Knott' }
const ghoul: NonPlayerEntitySummary = { id: 'a', type: 'MythosCreature', name: 'Ghoul' }
const cafe: NonPlayerEntitySummary = { id: 'c', type: 'HumanNpc', name: `Caf${eAcute} owner` }

describe('filterNonPlayerEntities', () => {
  it('sorts by name, then by id for equal names (SP-UX-29)', () => {
    const twin: NonPlayerEntitySummary = { id: 'a0', type: 'HumanNpc', name: 'Ghoul' }

    expect(filterNonPlayerEntities([knott, ghoul, twin], '', 'All').map((item) => item.id)).toEqual(['a', 'a0', 'b'])
  })

  it('matches a substring of the name regardless of case (SP-UX-30)', () => {
    expect(filterNonPlayerEntities([knott, ghoul], 'KNO', 'All')).toEqual([knott])
  })

  it('matches regardless of accents in the name or the search', () => {
    expect(filterNonPlayerEntities([cafe, knott], 'cafe', 'All')).toEqual([cafe])
    expect(filterNonPlayerEntities([cafe, knott], `caf${eAcute}`, 'All')).toEqual([cafe])
  })

  it('narrows by type and combines it with the search', () => {
    expect(filterNonPlayerEntities([knott, ghoul], '', 'HumanNpc')).toEqual([knott])
    expect(filterNonPlayerEntities([knott, ghoul], '', 'MythosCreature')).toEqual([ghoul])
    expect(filterNonPlayerEntities([knott, ghoul], 'ghoul', 'HumanNpc')).toEqual([])
  })

  it('ignores spaces around the search and returns nothing when nothing matches', () => {
    expect(filterNonPlayerEntities([knott], '  knott ', 'All')).toEqual([knott])
    expect(filterNonPlayerEntities([knott], 'zzz', 'All')).toEqual([])
  })

  it('does not change the loaded list', () => {
    const items = [knott, ghoul]

    filterNonPlayerEntities(items, '', 'All')

    expect(items).toEqual([knott, ghoul])
  })
})

describe('describeCounts', () => {
  it('writes both counts with singular and plural forms', () => {
    expect(describeCounts([knott, ghoul])).toBe('1 Human NPC and 1 Mythos Creature.')
    expect(describeCounts([knott, cafe, ghoul])).toBe('2 Human NPCs and 1 Mythos Creature.')
  })

  it('leaves out a zero count and returns nothing for no entities', () => {
    expect(describeCounts([knott, cafe])).toBe('2 Human NPCs.')
    expect(describeCounts([ghoul])).toBe('1 Mythos Creature.')
    expect(describeCounts([])).toBe('')
  })
})
