import { describe, expect, it } from 'vitest'

import { problem } from '@/campaign-play/test-support/characterSheetFixtures'

import { errorsOfStep, inlineErrorsForStep, isFieldTouched, mergeClientAndServerErrors } from './visibleErrors'

const nameRequired = problem('InvestigatorNameRequired', 'identity.name', "Enter your Investigator's name.")
const ageOutOfRange = problem('AgeOutOfRange', 'identity.age', 'Age must be between 15 and 89.')
const totalMismatch = problem('PointBuyTotalMismatch', 'characteristics', 'Your characteristics must add up to 460. They add up to 450.')
const gainRequired = problem('EduImprovementGainRequired', 'ageEffects.eduImprovementChecks[0].gain', 'Enter the 1D10 gain for EDU check 1.')
const intWarning = problem('PointBuyBelowRecommendation', 'characteristics.INT', 'INT is below the recommended 40.', 'Warning')

/** specs/character-sheet/ux.md section 5.2: client checks on blur, the server authoritative. */
describe('visibleErrors', () => {
  it('replaces the shared checks with the client result and keeps the server-only checks', () => {
    const merged = mergeClientAndServerErrors([ageOutOfRange], [nameRequired, gainRequired])

    expect(merged).toEqual([ageOutOfRange, gainRequired])
  })

  it('lists the errors (not warnings) that belong to a step', () => {
    expect(errorsOfStep([nameRequired, totalMismatch, intWarning, gainRequired], 'characteristics')).toEqual([totalMismatch])
  })

  it('treats a group as touched once any field inside it is', () => {
    const touched = new Set(['characteristics.STR', 'ageEffects.eduImprovementChecks[1].check'])

    expect(isFieldTouched('characteristics', touched)).toBe(true)
    expect(isFieldTouched('characteristics.STR', touched)).toBe(true)
    expect(isFieldTouched('characteristics.CON', touched)).toBe(false)
    expect(isFieldTouched('ageEffects.eduImprovementChecks[1]', touched)).toBe(true)
    expect(isFieldTouched('ageEffects.eduImprovementChecks[0]', touched)).toBe(false)
  })

  it('maps the visible errors of a step to one message per field', () => {
    const errors = [nameRequired, ageOutOfRange, totalMismatch]

    expect(inlineErrorsForStep(errors, 'identity', (field) => field === 'identity.age')).toEqual({
      'identity.age': 'Age must be between 15 and 89.',
    })
  })
})
