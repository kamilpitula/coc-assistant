import { describe, expect, it } from 'vitest'

import type { AgeBracket, CharacterSheetInputs, CharacterSheetView } from '@/campaign-play/types/CharacterSheet'

import { characterSheetFormReducer, eduBeforeEachCheck, inputsForSave, inputsFromSheet } from './characterSheetForm'

const characteristic = (assigned: number | null) => ({ assigned, value: assigned, hard: null, extreme: null })

const view: CharacterSheetView = {
  schemaVersion: 1,
  identity: { name: 'Harvey Walters', age: 45, gender: null, residence: 'Boston', birthplace: null },
  creationMethod: null,
  characteristics: {
    STR: characteristic(60),
    CON: characteristic(60),
    DEX: characteristic(60),
    APP: characteristic(50),
    POW: characteristic(60),
    SIZ: characteristic(60),
    INT: characteristic(60),
    EDU: characteristic(null),
  },
  ageEffects: {
    bracket: null,
    deductions: { STR: 3 },
    eduImprovementChecks: [{ check: 70, gain: 5, eduBefore: 50, eduAfter: 55 }],
  },
  luckRolls: [11],
  derived: {
    luck: null,
    hitPoints: null,
    magicPoints: null,
    sanity: { current: null, maximum: null },
    dodge: null,
    movementRate: null,
    damageBonus: null,
    build: null,
  },
  rollRecords: [],
}

const bracket45: AgeBracket = {
  minimumAge: 40,
  maximumAge: 49,
  physicalDeductionTotal: 5,
  physicalDeductionCharacteristics: ['STR', 'CON', 'DEX'],
  appearanceModifier: -5,
  eduImprovementChecks: 2,
  luckRolls: 1,
}

describe('characterSheetForm', () => {
  it('starts from the saved sheet, using Point buy as the only available creation method', () => {
    const inputs = inputsFromSheet(view)

    expect(inputs.identity).toEqual(view.identity)
    expect(inputs.creationMethod).toBe('PointBuy')
    expect(inputs.characteristics).toMatchObject({ STR: 60, EDU: null })
    expect(inputs.ageEffects).toEqual({ deductions: { STR: 3 }, eduImprovementChecks: [{ check: 70, gain: 5 }] })
    expect(inputs.luckRolls).toEqual([11])
  })

  it('applies each kind of change', () => {
    let inputs = inputsFromSheet(view)
    inputs = characterSheetFormReducer(inputs, { type: 'identity', field: 'name', value: 'Ada' })
    inputs = characterSheetFormReducer(inputs, { type: 'characteristic', code: 'EDU', value: 50 })
    inputs = characterSheetFormReducer(inputs, { type: 'luckRoll', index: 1, value: 13 })
    inputs = characterSheetFormReducer(inputs, { type: 'deduction', code: 'DEX', value: 2 })
    inputs = characterSheetFormReducer(inputs, { type: 'eduCheck', index: 1, part: 'check', value: 20 })

    expect(inputs.identity.name).toBe('Ada')
    expect(inputs.characteristics.EDU).toBe(50)
    expect(inputs.luckRolls).toEqual([11, 13])
    expect(inputs.ageEffects.deductions).toEqual({ STR: 3, DEX: 2 })
    expect(inputs.ageEffects.eduImprovementChecks).toEqual([
      { check: 70, gain: 5 },
      { check: 20, gain: null },
    ])
  })

  it('replaces everything with a reset', () => {
    const replacement = inputsFromSheet({ ...view, identity: { ...view.identity, name: 'Reset' } })

    expect(characterSheetFormReducer(inputsFromSheet(view), { type: 'reset', inputs: replacement })).toBe(replacement)
  })

  it('section 3.2: works out the EDU each check is rolled against, after earlier gains, capped at the EDU maximum', () => {
    expect(
      eduBeforeEachCheck(50, [
        { check: 70, gain: 5 },
        { check: 53, gain: null },
        { check: 56, gain: 2 },
      ]),
    ).toEqual([50, 55, 55])
    expect(eduBeforeEachCheck(95, [{ check: 100, gain: 10 }, { check: 10, gain: null }], 99)).toEqual([95, 99])
    expect(eduBeforeEachCheck(null, [{ check: 70, gain: 5 }])).toEqual([null])
  })

  it('keeps every input when saving from a step that does not own the age effects or Luck rows', () => {
    const inputs: CharacterSheetInputs = { ...inputsFromSheet(view), luckRolls: [11, 13] }

    expect(inputsForSave(inputs, 'identity', bracket45)).toEqual(inputs)
  })

  it('drops the Luck row the Characteristics step does not show when saving from it', () => {
    const inputs: CharacterSheetInputs = { ...inputsFromSheet(view), luckRolls: [11, 13] }

    expect(inputsForSave(inputs, 'characteristics', bracket45).luckRolls).toEqual([11])
  })

  it('drops the age inputs the Age effects step does not show when saving from it', () => {
    const base = inputsFromSheet(view)
    const inputs: CharacterSheetInputs = {
      ...base,
      characteristics: { ...base.characteristics, EDU: 50 },
      ageEffects: {
        deductions: { STR: 3, SIZ: 2 },
        eduImprovementChecks: [
          { check: 30, gain: 4 },
          { check: 70, gain: 5 },
          { check: 10, gain: null },
        ],
      },
    }

    expect(inputsForSave(inputs, 'age', bracket45).ageEffects).toEqual({
      deductions: { STR: 3 },
      eduImprovementChecks: [
        { check: 30, gain: null },
        { check: 70, gain: 5 },
      ],
    })
  })
})
