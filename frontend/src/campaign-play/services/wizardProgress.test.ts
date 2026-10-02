import { describe, expect, it } from 'vitest'

import type { CharacterSheetView, ValidationError } from '@/campaign-play/types/CharacterSheet'

import { resumeStep, stepNumber, stepOfField, stepStates, WIZARD_STEPS } from './wizardProgress'

const emptyCharacteristic = { assigned: null, value: null, hard: null, extreme: null }

function sheet(overrides: Partial<CharacterSheetView> = {}): CharacterSheetView {
  return {
    schemaVersion: 1,
    identity: { name: null, age: null, gender: null, residence: null, birthplace: null },
    creationMethod: null,
    characteristics: {
      STR: emptyCharacteristic,
      CON: emptyCharacteristic,
      DEX: emptyCharacteristic,
      APP: emptyCharacteristic,
      POW: emptyCharacteristic,
      SIZ: emptyCharacteristic,
      INT: emptyCharacteristic,
      EDU: emptyCharacteristic,
    },
    ageEffects: { bracket: null, deductions: {}, eduImprovementChecks: [] },
    luckRolls: [],
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
    ...overrides,
  }
}

function problem(field: string, severity: 'Error' | 'Warning' = 'Error'): ValidationError {
  return { code: 'Some', field, message: 'Some problem.', expected: null, actual: null, severity }
}

const named = sheet({ identity: { name: 'Harvey Walters', age: 25, gender: null, residence: null, birthplace: null } })
const withCharacteristics = sheet({
  identity: named.identity,
  characteristics: { ...named.characteristics, STR: { assigned: 60, value: 60, hard: 30, extreme: 12 } },
  luckRolls: [11],
})
const allStepsFilled = sheet({
  ...withCharacteristics,
  ageEffects: { bracket: null, deductions: {}, eduImprovementChecks: [{ check: 30, gain: null, eduBefore: 50, eduAfter: 50 }] },
})

/** specs/character-sheet/ux.md sections 4.1 and 5.3 with the PBI-CP-003 steps of section 9. */
describe('wizardProgress', () => {
  it('has the four PBI-CP-003 steps in order', () => {
    expect(WIZARD_STEPS.map((step) => step.label)).toEqual([
      'Identity',
      'Characteristics',
      'Age effects',
      'Sheet and submit',
    ])
  })

  it('numbers the steps from 1 for "Step N of 4"', () => {
    expect(WIZARD_STEPS.map((step) => stepNumber(step.id))).toEqual([1, 2, 3, 4])
  })

  it.each([
    ['identity.age', 'identity'],
    ['creationMethod', 'characteristics'],
    ['characteristics', 'characteristics'],
    ['characteristics.STR', 'characteristics'],
    ['luckRolls[1]', 'characteristics'],
    ['ageEffects.deductions', 'age'],
    ['ageEffects.eduImprovementChecks[0].gain', 'age'],
  ])('maps the field %s to the %s step', (field, step) => {
    expect(stepOfField(field)).toBe(step)
  })

  it('marks every step not started for an empty Draft and resumes at Identity', () => {
    expect(stepStates(sheet(), [])).toEqual({
      identity: 'notStarted',
      characteristics: 'notStarted',
      age: 'notStarted',
      sheet: 'notStarted',
    })
    expect(resumeStep(sheet(), [])).toBe('identity')
  })

  it('completes a started step without errors and resumes at the first step not completed', () => {
    expect(stepStates(named, [])).toMatchObject({ identity: 'completed', characteristics: 'notStarted' })
    expect(resumeStep(named, [])).toBe('characteristics')
  })

  it('marks a started step with errors as needing attention and resumes there', () => {
    const errors = [problem('characteristics.CON'), problem('ageEffects.eduImprovementChecks[0].check')]

    expect(stepStates(withCharacteristics, errors)).toMatchObject({
      identity: 'completed',
      characteristics: 'needsAttention',
      age: 'notStarted',
    })
    expect(resumeStep(withCharacteristics, errors)).toBe('characteristics')
  })

  it('ignores warnings when deciding whether a step is completed', () => {
    expect(stepStates(named, [problem('identity.name', 'Warning')]).identity).toBe('completed')
  })

  it('opens Sheet and submit once every earlier step is completed', () => {
    expect(stepStates(allStepsFilled, [])).toEqual({
      identity: 'completed',
      characteristics: 'completed',
      age: 'completed',
      sheet: 'completed',
    })
    expect(resumeStep(allStepsFilled, [])).toBe('sheet')
  })
})
