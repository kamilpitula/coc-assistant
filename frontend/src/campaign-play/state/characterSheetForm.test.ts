import { describe, expect, it } from 'vitest'

import { antiquarianInputs, rules, sheetView, skill, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'
import type { AgeBracket, CharacterSheetInputs, CharacterSheetView } from '@/campaign-play/types/CharacterSheet'

import {
  characterSheetFormReducer,
  clearsSkillInputs,
  eduBeforeEachCheck,
  hasCharacteristicInputs,
  inputsForSave,
  inputsFromSheet,
} from './characterSheetForm'

const characteristic = (assigned: number | null) => ({ assigned, value: assigned, hard: null, extreme: null })

const view: CharacterSheetView = {
  ...sheetView(),
  schemaVersion: 2,
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
  occupation: null,
  skills: [],
  quickFire: { values: [], personalInterests: [] },
  characteristicRolls: {},
  derived: {
    luck: null,
    idea: null,
    know: null,
    hitPoints: null,
    magicPoints: null,
    sanity: { current: null, maximum: null },
    dodge: null,
    movementRate: null,
    damageBonus: null,
    build: null,
    occupationPoints: null,
    personalInterestPoints: null,
    creditRating: null,
    wealth: null,
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
  const weapon = { name: 'Knife', skill: 'Fighting (Brawl)', damage: '1D4', attacks: '1', range: null, ammo: null, malfunction: null }

  it('starts from the saved backstory, Key Connection, weapons without the custom flag, and gear', () => {
    const inputs = inputsFromSheet({
      ...view,
      backstory: { ...view.backstory, traits: 'Stubborn' },
      keyConnection: 'traits',
      weapons: [{ ...weapon, isCustom: true }],
      gear: 'Lantern',
    })

    expect(inputs.backstory.traits).toBe('Stubborn')
    expect(inputs.keyConnection).toBe('traits')
    expect(inputs.weapons).toEqual([weapon])
    expect(inputs.gear).toBe('Lantern')
  })

  it('section 12: records the backstory and the Key Connection, and clears the Key Connection when its entry is emptied', () => {
    let inputs = characterSheetFormReducer(validInputs, { type: 'backstory', key: 'significantPeople', value: 'My sister Ada' })
    inputs = characterSheetFormReducer(inputs, { type: 'backstory', key: 'myStory', value: 'A story' })
    inputs = characterSheetFormReducer(inputs, { type: 'keyConnection', entry: 'significantPeople' })

    expect(inputs.backstory).toMatchObject({ significantPeople: 'My sister Ada', myStory: 'A story' })
    expect(inputs.keyConnection).toBe('significantPeople')

    const kept = characterSheetFormReducer(inputs, { type: 'backstory', key: 'traits', value: '' })
    expect(kept.keyConnection).toBe('significantPeople')

    const emptied = characterSheetFormReducer(inputs, { type: 'backstory', key: 'significantPeople', value: '  ' })
    expect(emptied.keyConnection).toBeNull()
  })

  it('adds, edits, and removes custom weapons, and records gear', () => {
    let inputs = characterSheetFormReducer(validInputs, { type: 'addWeapon' })
    inputs = characterSheetFormReducer(inputs, { type: 'addWeapon' })
    inputs = characterSheetFormReducer(inputs, { type: 'weapon', index: 1, field: 'name', value: 'Knife' })
    inputs = characterSheetFormReducer(inputs, { type: 'removeWeapon', index: 0 })
    inputs = characterSheetFormReducer(inputs, { type: 'gear', value: 'Lantern' })

    expect(inputs.weapons).toEqual([{ name: 'Knife', skill: null, damage: null, attacks: null, range: null, ammo: null, malfunction: null }])
    expect(inputs.gear).toBe('Lantern')
  })

  it('starts from the saved sheet, with its creation method', () => {
    const inputs = inputsFromSheet({ ...view, creationMethod: 'PointBuy' })

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

  it('starts a Standard rolling sheet from its raw rolls, not the computed values', () => {
    const inputs = inputsFromSheet({ ...view, creationMethod: 'StandardRolling', characteristicRolls: { STR: 12, SIZ: 6 } })

    expect(inputs.characteristicRolls).toEqual({ STR: 12, SIZ: 6 })
    expect(inputs.characteristics).toEqual({})
  })

  it('starts from the saved occupation, allocations, and Quick fire skills without the computed values', () => {
    const saved = sheetView({ quickFire: { values: [{ ...skill('Law'), value: 70 }], personalInterests: [skill('Listen')] } })

    const inputs = inputsFromSheet(saved)

    expect(inputs.occupation).toEqual(antiquarianInputs)
    expect(inputs.skills).toEqual([
      { ...skill('Credit Rating'), occupationPoints: 30, personalInterestPoints: null },
      { ...skill('Library Use'), occupationPoints: 50, personalInterestPoints: null },
      { ...skill('Drive Auto'), occupationPoints: null, personalInterestPoints: 60 },
    ])
    expect(inputs.quickFire).toEqual({ ...saved.quickFire, extraSkill: null })
  })

  it('clears the characteristic values when the creation method changes', () => {
    const switched = characterSheetFormReducer({ ...validInputs, characteristicRolls: { STR: 10 } }, { type: 'creationMethod', method: 'StandardRolling' })

    expect(switched.creationMethod).toBe('StandardRolling')
    expect(switched.characteristics).toEqual({})
    expect(switched.characteristicRolls).toEqual({})
    expect(switched.skills).toEqual(validInputs.skills)
  })

  it('clears the other method\'s skill inputs only when switching to or from Quick fire', () => {
    const toQuickFire = characterSheetFormReducer(validInputs, { type: 'creationMethod', method: 'QuickFire' })
    const back = characterSheetFormReducer(
      { ...toQuickFire, quickFire: { values: [{ ...skill('Law'), value: 70 }], personalInterests: [] } },
      { type: 'creationMethod', method: 'PointBuy' },
    )

    expect(toQuickFire.skills).toEqual([])
    expect(back.quickFire).toEqual({ values: [], personalInterests: [], extraSkill: null })
    expect(clearsSkillInputs(validInputs, 'QuickFire')).toBe(true)
    expect(clearsSkillInputs(validInputs, 'StandardRolling')).toBe(false)
  })

  it('knows when characteristic values have been entered, so a switch needs confirmation', () => {
    expect(hasCharacteristicInputs(validInputs)).toBe(true)
    expect(hasCharacteristicInputs({ ...validInputs, characteristics: {}, characteristicRolls: { STR: null } })).toBe(false)
  })

  it('applies the occupation and skill changes, keeping later inputs when the occupation changes', () => {
    let inputs: CharacterSheetInputs = { ...validInputs }
    inputs = characterSheetFormReducer(inputs, { type: 'characteristicRoll', code: 'STR', value: 12 })
    inputs = characterSheetFormReducer(inputs, { type: 'occupation', catalogId: 'police-detective', custom: null })
    inputs = characterSheetFormReducer(inputs, { type: 'formulaCharacteristic', index: 1, value: 'DEX' })
    inputs = characterSheetFormReducer(inputs, { type: 'skillChoice', slot: 5, picks: [skill('Persuade')] })
    inputs = characterSheetFormReducer(inputs, { type: 'skillPoints', skill: skill('Library Use'), column: 'personalInterestPoints', value: 10 })
    inputs = characterSheetFormReducer(inputs, { type: 'skillPoints', skill: skill('Drive Auto'), column: 'personalInterestPoints', value: null })
    inputs = characterSheetFormReducer(inputs, { type: 'skillPoints', skill: skill('Firearms', 'Rifle/Shotgun'), column: 'occupationPoints', value: 20 })

    expect(inputs.characteristicRolls).toEqual({ STR: 12 })
    expect(inputs.occupation).toEqual({ ...antiquarianInputs, catalogId: 'police-detective', formulaCharacteristics: [null, 'DEX'], skillChoices: [
      ...antiquarianInputs.skillChoices.slice(0, 5),
      [skill('Persuade')],
      ...antiquarianInputs.skillChoices.slice(6),
    ] })
    expect(inputs.skills).toEqual([
      { ...skill('Credit Rating'), occupationPoints: 30, personalInterestPoints: null },
      { ...skill('Library Use'), occupationPoints: 50, personalInterestPoints: 10 },
      { ...skill('Firearms', 'Rifle/Shotgun'), occupationPoints: 20, personalInterestPoints: null },
    ])
  })

  it('defines a custom occupation with empty skill pickers', () => {
    const inputs = characterSheetFormReducer(validInputs, { type: 'occupation', catalogId: null, custom: { name: 'Bootlegger', formulaId: null, skills: [], creditRatingMin: null, creditRatingMax: null } })

    expect(inputs.occupation?.catalogId).toBeNull()
    expect(inputs.occupation?.custom?.name).toBe('Bootlegger')
  })

  it('assigns Quick fire values and personal interests', () => {
    let inputs: CharacterSheetInputs = { ...validInputs, creationMethod: 'QuickFire', skills: [] }
    inputs = characterSheetFormReducer(inputs, { type: 'quickFireValue', skill: skill('Law'), value: 70 })
    inputs = characterSheetFormReducer(inputs, { type: 'quickFireValue', skill: skill('Credit Rating'), value: 30 })
    inputs = characterSheetFormReducer(inputs, { type: 'quickFireValue', skill: skill('Law'), value: null })
    inputs = characterSheetFormReducer(inputs, { type: 'quickFireInterest', skill: skill('Listen'), chosen: true })
    inputs = characterSheetFormReducer(inputs, { type: 'quickFireInterest', skill: skill('Swim'), chosen: true })
    inputs = characterSheetFormReducer(inputs, { type: 'quickFireInterest', skill: skill('Listen'), chosen: false })

    expect(inputs.quickFire).toEqual({ values: [{ ...skill('Credit Rating'), value: 30 }], personalInterests: [skill('Swim')] })
  })

  it('section 18: stores the extra skill that takes the freed value, and clears it', () => {
    const chosen = characterSheetFormReducer({ ...validInputs, creationMethod: 'QuickFire' }, { type: 'quickFireExtraSkill', skill: skill('Drive Auto') })
    const cleared = characterSheetFormReducer(chosen, { type: 'quickFireExtraSkill', skill: null })

    expect(chosen.quickFire.extraSkill).toEqual(skill('Drive Auto'))
    expect(cleared.quickFire.extraSkill).toBeNull()
  })

  it('never saves inputs of another creation method', () => {
    const mixed: CharacterSheetInputs = {
      ...validInputs,
      creationMethod: 'StandardRolling',
      characteristicRolls: { STR: 12 },
      quickFire: { values: [{ ...skill('Law'), value: 70 }], personalInterests: [] },
    }

    const saved = inputsForSave(mixed, 'occupation', null, rules)

    expect(saved.characteristics).toEqual({})
    expect(saved.characteristicRolls).toEqual({ STR: 12 })
    expect(saved.quickFire).toEqual({ values: [], personalInterests: [], extraSkill: null })
    expect(saved.skills).toEqual(validInputs.skills)
  })

  it('section 2.1: works out the EDU checks against the rolled EDU under Standard rolling', () => {
    const inputs: CharacterSheetInputs = {
      ...validInputs,
      creationMethod: 'StandardRolling',
      characteristics: {},
      characteristicRolls: { EDU: 4 },
      ageEffects: { deductions: {}, eduImprovementChecks: [{ check: 60, gain: 5 }, { check: 10, gain: 3 }] },
    }

    expect(inputsForSave(inputs, 'age', bracket45, rules).ageEffects.eduImprovementChecks).toEqual([
      { check: 60, gain: 5 },
      { check: 10, gain: null },
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
    const inputs: CharacterSheetInputs = { ...inputsFromSheet({ ...view, creationMethod: 'PointBuy' }), luckRolls: [11, 13] }

    expect(inputsForSave(inputs, 'identity', bracket45, rules)).toEqual(inputs)
  })

  it('drops the Luck row the Characteristics step does not show when saving from it', () => {
    const inputs: CharacterSheetInputs = { ...inputsFromSheet(view), luckRolls: [11, 13] }

    expect(inputsForSave(inputs, 'characteristics', bracket45, rules).luckRolls).toEqual([11])
  })

  it('drops the age inputs the Age effects step does not show when saving from it', () => {
    const base = inputsFromSheet({ ...view, creationMethod: 'PointBuy' })
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

    expect(inputsForSave(inputs, 'age', bracket45, rules).ageEffects).toEqual({
      deductions: { STR: 3 },
      eduImprovementChecks: [
        { check: 30, gain: null },
        { check: 70, gain: 5 },
      ],
    })
  })
})
