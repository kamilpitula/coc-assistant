import { describe, expect, it } from 'vitest'

import { antiquarianInputs, occupationCatalog, skill } from '@/campaign-play/test-support/characterSheetFixtures'

import { formulaPoints, occupationSkillsOf, openSlotsOf, selectedCatalogOccupation } from './occupationSkills'

const antiquarian = occupationCatalog.occupations[0]
const policeDetective = occupationCatalog.occupations[1]

/** docs/game-rules section 7 (occupation slots and formulas), as the wizard shows them (specs/character-sheet/ux.md 6.4, 6.5). */
describe('occupationSkills', () => {
  it('section 7.2: lists the open slots with the picks each needs and the skills it offers', () => {
    expect(openSlotsOf(antiquarian, occupationCatalog)).toEqual([
      { index: 1, needed: 1, label: 'Art/Craft specialization', options: [skill('Art/Craft')], specializationOnly: true },
      { index: 4, needed: 1, label: 'Language (Other) specialization', options: [skill('Language (Other)')], specializationOnly: true },
      { index: 5, needed: 1, label: 'Choose 1 interpersonal skill', options: [skill('Charm'), skill('Fast Talk'), skill('Intimidate'), skill('Persuade')], specializationOnly: false },
      { index: 7, needed: 1, label: 'Choose 1 skill of your choice', options: null, specializationOnly: false },
    ])
    expect(openSlotsOf(policeDetective, occupationCatalog)[0]).toEqual({
      index: 0,
      needed: 1,
      label: 'Choose 1: Art/Craft (Acting) or Disguise',
      options: [skill('Art/Craft', 'Acting'), skill('Disguise')],
      specializationOnly: false,
    })
  })

  it('section 7.2: gives the fixed skills and the picks as the occupation skills', () => {
    expect(occupationSkillsOf(antiquarianInputs, occupationCatalog)).toEqual([
      skill('Appraise'),
      skill('Art/Craft', 'Painting'),
      skill('History'),
      skill('Library Use'),
      skill('Language (Other)', 'Latin'),
      skill('Charm'),
      skill('Spot Hidden'),
      skill('Firearms', 'Handgun'),
    ])
  })

  it('gives a custom occupation its chosen skills', () => {
    const custom = { catalogId: null, custom: { name: 'Bootlegger', formulaId: null, skills: [skill('Drive Auto'), null], creditRatingMin: 5, creditRatingMax: 30 }, formulaCharacteristics: [], skillChoices: [] }

    expect(occupationSkillsOf(custom, occupationCatalog)).toEqual([skill('Drive Auto')])
    expect(selectedCatalogOccupation(custom, occupationCatalog)).toBeNull()
  })

  it('section 7.1: works out the points of a formula, using the pick when a term offers several characteristics', () => {
    const values = { EDU: 60, DEX: 70, STR: 50 }

    expect(formulaPoints(antiquarian.occupationPointFormula.terms, values, [])).toBe(240)
    expect(formulaPoints(policeDetective.occupationPointFormula.terms, values, [null, 'STR'])).toBe(220)
    expect(formulaPoints(policeDetective.occupationPointFormula.terms, values, [])).toBeNull()
    expect(formulaPoints(policeDetective.occupationPointFormula.terms, { EDU: 60 }, [null, 'DEX'])).toBeNull()
  })
})
