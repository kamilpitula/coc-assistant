import { describe, expect, it } from 'vitest'

import { antiquarianInputs, emptySheetView, problem, sheetView, skill } from '@/campaign-play/test-support/characterSheetFixtures'
import type { CharacterSheetView } from '@/campaign-play/types/CharacterSheet'

import { resumeStep, stepNumber, stepOfField, stepStates, WIZARD_STEPS } from './wizardProgress'

const empty = emptySheetView()
const named = { ...empty, identity: sheetView().identity }
const withCharacteristics: CharacterSheetView = { ...named, characteristics: sheetView().characteristics, luckRolls: [11] }
const withAgeEffects: CharacterSheetView = { ...withCharacteristics, ageEffects: sheetView().ageEffects }
const withOccupation: CharacterSheetView = { ...withAgeEffects, occupation: { ...sheetView().occupation!, skillChoices: [] } }
const withOccupationSkills: CharacterSheetView = {
  ...withOccupation,
  skills: [{ ...sheetView().skills[0], occupationPoints: 30 }],
}
const allStepsFilled = sheetView()

function error(field: string) {
  return problem('Some', field, 'Some problem.')
}

/** specs/character-sheet/ux.md sections 4.1, 5.3, and 5.4 with the PBI-CP-009 steps of section 9. */
describe('wizardProgress', () => {
  it('has the seven steps in order', () => {
    expect(WIZARD_STEPS.map((step) => step.label)).toEqual([
      'Identity',
      'Characteristics',
      'Age effects',
      'Occupation',
      'Occupation skills',
      'Personal interests',
      'Sheet and submit',
    ])
  })

  it('numbers the steps from 1 for "Step N of 7"', () => {
    expect(WIZARD_STEPS.map((step) => stepNumber(step.id))).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it.each([
    ['identity.age', 'identity'],
    ['creationMethod', 'characteristics'],
    ['characteristics', 'characteristics'],
    ['characteristics.STR', 'characteristics'],
    ['characteristicRolls.SIZ', 'characteristics'],
    ['luckRolls[1]', 'characteristics'],
    ['ageEffects.deductions', 'age'],
    ['ageEffects.eduImprovementChecks[0].gain', 'age'],
    ['occupation', 'occupation'],
    ['occupation.catalogId', 'occupation'],
    ['occupation.formulaCharacteristics[1]', 'occupation'],
    ['occupation.custom.skills[2].specialization', 'occupation'],
    ['occupation.skillChoices[5]', 'occupation-skills'],
    ['occupation.skillChoices[1][0].specialization', 'occupation-skills'],
    ['occupationPoints', 'occupation-skills'],
    ['creditRating', 'occupation-skills'],
    ['skills[3].occupationPoints', 'occupation-skills'],
    ['quickFire.values[2].value', 'occupation-skills'],
    ['quickFire.values', 'occupation-skills'],
    ['quickFire.extraSkill', 'occupation-skills'],
    ['skills[3].personalInterestPoints', 'personal-interests'],
    ['skills[3].skill', 'personal-interests'],
    ['skills', 'personal-interests'],
    ['personalInterestPoints', 'personal-interests'],
    ['quickFire.personalInterests[1]', 'personal-interests'],
    ['weapons[0].name', 'sheet'],
    ['backstory.traits', 'sheet'],
  ])('maps the field %s to the %s step', (field, step) => {
    expect(stepOfField(field)).toBe(step)
  })

  it('marks every step not started for an empty Draft and resumes at Identity', () => {
    expect(Object.values(stepStates(empty, []))).toEqual(Array(7).fill('notStarted'))
    expect(resumeStep(empty, [])).toBe('identity')
  })

  it('completes a started step without errors and resumes at the first step not completed', () => {
    expect(stepStates(named, [])).toMatchObject({ identity: 'completed', characteristics: 'notStarted' })
    expect(resumeStep(named, [])).toBe('characteristics')
  })

  it('starts Characteristics from Standard rolling rolls alone', () => {
    expect(stepStates({ ...named, characteristicRolls: { STR: 11 } }, []).characteristics).toBe('completed')
  })

  it('marks a started step with errors as needing attention and resumes there', () => {
    const errors = [error('characteristics.CON'), error('ageEffects.eduImprovementChecks[0].check')]

    expect(stepStates(withCharacteristics, errors)).toMatchObject({
      identity: 'completed',
      characteristics: 'needsAttention',
      age: 'notStarted',
    })
    expect(resumeStep(withCharacteristics, errors)).toBe('characteristics')
  })

  it('ignores warnings when deciding whether a step is completed', () => {
    expect(stepStates(named, [problem('Some', 'identity.name', 'Some.', 'Warning')]).identity).toBe('completed')
  })

  it('starts Occupation once one is chosen and Occupation skills once a pick or point is entered', () => {
    expect(stepStates(withOccupation, [])).toMatchObject({ occupation: 'completed', 'occupation-skills': 'notStarted' })
    expect(resumeStep(withOccupation, [])).toBe('occupation-skills')

    const picksOnly: CharacterSheetView = {
      ...withOccupation,
      occupation: { ...withOccupation.occupation!, skillChoices: antiquarianInputs.skillChoices },
    }
    expect(stepStates(picksOnly, [])['occupation-skills']).toBe('completed')
  })

  it('starts Occupation skills from Quick fire values', () => {
    const quickFire: CharacterSheetView = { ...withOccupation, quickFire: { values: [{ ...skill('Law'), value: 70 }], personalInterests: [] } }

    expect(stepStates(quickFire, [])['occupation-skills']).toBe('completed')
  })

  it('counts Personal interests as started once Occupation skills is completed, since its points are optional', () => {
    expect(stepStates(withOccupationSkills, [])).toMatchObject({ 'occupation-skills': 'completed', 'personal-interests': 'completed' })
    expect(stepStates(withOccupation, [])['personal-interests']).toBe('notStarted')
  })

  it('UX-7: lowering EDU after allocating marks Occupation skills as needing attention', () => {
    const states = stepStates(withOccupationSkills, [error('occupationPoints')])

    expect(states['occupation-skills']).toBe('needsAttention')
    expect(states.sheet).toBe('notStarted')
  })

  it('opens Sheet and submit once every earlier step is completed', () => {
    expect(Object.values(stepStates(allStepsFilled, []))).toEqual(Array(7).fill('completed'))
    expect(resumeStep(allStepsFilled, [])).toBe('sheet')
  })
})
