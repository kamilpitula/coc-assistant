import { stepOfField, type WizardStep } from '@/campaign-play/services/wizardProgress'
import type { ValidationError } from '@/campaign-play/types/CharacterSheet'

/** Codes only the server can check (scope "server" in the ValidationError catalog of specs/character-sheet/spec.md). */
const SERVER_ONLY_CODES = new Set([
  'CreationMethodNotAllowed',
  'CharacteristicBelowFloor',
  'EduImprovementGainRequired',
  'EduImprovementGainNotAllowed',
  'OccupationNotAvailable',
  'OccupationFormulaChoiceRequired',
  'OccupationSkillChoiceRequired',
  'OccupationSkillChoiceNotAllowed',
  'SpecializationRequired',
  'SpecializationNotAllowed',
  'UnknownSkill',
  'OccupationPointsOutsideOccupationSkills',
  'OccupationPointsOverspent',
  'CreditRatingOutOfRange',
  'PersonalInterestPointsOverspent',
  'QuickFireSkillAssignmentMismatch',
  'QuickFireSkillNotOccupationSkill',
  'QuickFireCreditRatingValue',
  'QuickFirePersonalInterestNotAllowed',
])

/** After a blur, the client's shared checks replace the server's, and the server-only results of the last save stay. */
export function mergeClientAndServerErrors(clientErrors: ValidationError[], serverErrors: ValidationError[]): ValidationError[] {
  return [...clientErrors, ...serverErrors.filter((error) => SERVER_ONLY_CODES.has(error.code))]
}

/** The errors (not warnings) owned by a step. */
export function errorsOfStep(errors: ValidationError[], step: WizardStep): ValidationError[] {
  return errors.filter((error) => error.severity === 'Error' && stepOfField(error.field) === step)
}

/** A field counts as touched when it, or any field inside its group, has lost focus. */
export function isFieldTouched(field: string, touched: ReadonlySet<string>): boolean {
  return [...touched].some((candidate) => candidate === field || candidate.startsWith(`${field}.`))
}

/** One inline message per field for the errors of the step that should be visible now. */
export function inlineErrorsForStep(
  errors: ValidationError[],
  step: WizardStep,
  isVisible: (field: string) => boolean,
): Record<string, string> {
  const inline: Record<string, string> = {}
  for (const error of errorsOfStep(errors, step)) {
    if (isVisible(error.field) && !(error.field in inline)) {
      inline[error.field] = error.message
    }
  }
  return inline
}
