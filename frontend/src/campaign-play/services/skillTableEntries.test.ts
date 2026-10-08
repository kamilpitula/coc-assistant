import { describe, expect, it } from 'vitest'

import { occupationCatalog, sheetView, skill, skillCatalog, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { skillTableEntries, skillTotal } from './skillTableEntries'

/** docs/game-rules sections 6, 7.2, 8, 9, and 18, as the skill tables show them (specs/character-sheet/ux.md 6.5, 6.6). */
describe('skillTableEntries', () => {
  it('lists the saved rows, then occupation skills, allocations, and added specializations not saved yet', () => {
    const inputs = { ...validInputs, skills: [...validInputs.skills, { ...skill('Firearms', 'Rifle/Shotgun'), occupationPoints: 10, personalInterestPoints: null }] }

    const entries = skillTableEntries(sheetView(), inputs, skillCatalog, occupationCatalog, [skill('Language (Other)', 'French')])

    expect(entries.map((entry) => entry.skill)).toEqual([
      skill('Credit Rating'),
      skill('Appraise'),
      skill('Charm'),
      skill('Library Use'),
      skill('Cthulhu Mythos'),
      skill('Drive Auto'),
      skill('Listen'),
      skill('Firearms', 'Handgun'),
      skill('Art/Craft', 'Painting'),
      skill('History'),
      skill('Language (Other)', 'Latin'),
      skill('Spot Hidden'),
      skill('Firearms', 'Rifle/Shotgun'),
      skill('Language (Other)', 'French'),
    ])
    expect(entries.find((entry) => entry.skill.skill === 'History')).toEqual({ skill: skill('History'), base: 5, isOccupationSkill: true })
    expect(entries.find((entry) => entry.skill.specialization === 'Rifle/Shotgun')?.base).toBe(25)
  })

  it('section 9: totals base plus points; section 18: a Quick fire value replaces the base and an interest adds its bonus', () => {
    expect(skillTotal(20, { ...validInputs }, skill('Library Use'), 20)).toBe(70)
    const quickFire = { ...validInputs, creationMethod: 'QuickFire' as const, quickFire: { values: [{ ...skill('Law'), value: 70 }], personalInterests: [skill('Listen')] } }
    expect(skillTotal(5, quickFire, skill('Law'), 20)).toBe(70)
    expect(skillTotal(20, quickFire, skill('Listen'), 20)).toBe(40)
    expect(skillTotal(null, quickFire, skill('Swim'), 20)).toBeNull()
  })
})
