import { describe, expect, it } from 'vitest'

import { skill, skillCatalog } from '@/campaign-play/test-support/characterSheetFixtures'

import { familyOf, skillBaseOf, skillNames } from './skillBases'

/** docs/game-rules sections 6.1 and 6.2; project_ruleset.md section 4.2. Display only: the server computes the sheet. */
describe('skillBases', () => {
  const values = { DEX: 70, EDU: 60 }

  it('reads fixed and characteristic bases from the skill catalog', () => {
    expect(skillBaseOf(skill('Library Use'), skillCatalog, values)).toBe(20)
    expect(skillBaseOf(skill('Dodge'), skillCatalog, values)).toBe(35)
    expect(skillBaseOf(skill('Dodge'), skillCatalog, {})).toBeNull()
  })

  it('takes a closed family base from its specialization and an open family base from the family', () => {
    expect(skillBaseOf(skill('Firearms', 'Rifle/Shotgun'), skillCatalog, values)).toBe(25)
    expect(skillBaseOf(skill('Firearms', 'Laser'), skillCatalog, values)).toBeNull()
    expect(skillBaseOf(skill('Art/Craft', 'Painting'), skillCatalog, values)).toBe(5)
  })

  it('tells closed, open, and plain skills apart', () => {
    expect(familyOf('Firearms', skillCatalog)).toBe('closed')
    expect(familyOf('Art/Craft', skillCatalog)).toBe('open')
    expect(familyOf('Library Use', skillCatalog)).toBe('none')
  })

  it('lists every skill name a picker offers, families once, without specialized sheet entries', () => {
    expect(skillNames(skillCatalog)).toEqual([
      'Appraise',
      'Art/Craft',
      'Charm',
      'Credit Rating',
      'Cthulhu Mythos',
      'Dodge',
      'Drive Auto',
      'Fast Talk',
      'Firearms',
      'History',
      'Language (Other)',
      'Library Use',
      'Listen',
      'Persuade',
      'Spot Hidden',
    ])
  })
})
