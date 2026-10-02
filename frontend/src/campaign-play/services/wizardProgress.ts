import {
  CHARACTERISTIC_CODES,
  type CharacterSheetView,
  type ValidationError,
} from '@/campaign-play/types/CharacterSheet'

/** The creation wizard steps delivered by PBI-CP-003 (specs/character-sheet/ux.md sections 4.1 and 9). */
export const WIZARD_STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'characteristics', label: 'Characteristics' },
  { id: 'age', label: 'Age effects' },
  { id: 'sheet', label: 'Sheet and submit' },
] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]['id']

/** Stepper item states of ux.md section 4.1; the current step is shown on top of its state. */
export type StepState = 'completed' | 'needsAttention' | 'notStarted'

const WIZARD_STEP_IDS: readonly WizardStep[] = WIZARD_STEPS.map((step) => step.id)

export function isWizardStep(value: string): value is WizardStep {
  return WIZARD_STEP_IDS.some((step) => step === value)
}

/** The step that owns a ValidationError field, so its error summary link can open that step. */
export function stepOfField(field: string): WizardStep {
  if (field.startsWith('identity')) {
    return 'identity'
  }

  if (field.startsWith('ageEffects')) {
    return 'age'
  }

  const onCharacteristicsStep = ['creationMethod', 'characteristics', 'luckRolls'].some((prefix) => field.startsWith(prefix))
  return onCharacteristicsStep ? 'characteristics' : 'sheet'
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== ''
}

/** A step is started once the Player has entered any of its inputs. */
function isStarted(step: WizardStep, sheet: CharacterSheetView): boolean {
  switch (step) {
    case 'identity':
      return Object.values(sheet.identity).some(hasValue)
    case 'characteristics':
      return CHARACTERISTIC_CODES.some((code) => hasValue(sheet.characteristics[code].assigned)) || sheet.luckRolls.some(hasValue)
    case 'age':
      return (
        Object.values(sheet.ageEffects.deductions).some(hasValue) ||
        sheet.ageEffects.eduImprovementChecks.some((check) => hasValue(check.check) || hasValue(check.gain))
      )
    default:
      return false
  }
}

/**
 * Each step's state, derived from the saved sheet and its errors (ux.md sections 4.1 and 5.3): a started step is
 * completed when it has no errors and needs attention otherwise. Sheet and submit opens once every earlier step is
 * completed. Warnings never affect a step's state.
 */
export function stepStates(sheet: CharacterSheetView, validationErrors: ValidationError[]): Record<WizardStep, StepState> {
  const stepsWithErrors = new Set(
    validationErrors.filter((error) => error.severity === 'Error').map((error) => stepOfField(error.field)),
  )
  const stateOf = (step: WizardStep): StepState => {
    if (!isStarted(step, sheet)) {
      return 'notStarted'
    }

    return stepsWithErrors.has(step) ? 'needsAttention' : 'completed'
  }

  const identity = stateOf('identity')
  const characteristics = stateOf('characteristics')
  const age = stateOf('age')
  const allCompleted = [identity, characteristics, age].every((state) => state === 'completed')
  return { identity, characteristics, age, sheet: allCompleted ? 'completed' : 'notStarted' }
}

/** The first step that is not completed, or Sheet and submit when every earlier step is (ux.md section 5.3). */
export function resumeStep(sheet: CharacterSheetView, validationErrors: ValidationError[]): WizardStep {
  const states = stepStates(sheet, validationErrors)
  return WIZARD_STEP_IDS.find((step) => step !== 'sheet' && states[step] !== 'completed') ?? 'sheet'
}

/** The 1-based position of a step, for "Step N of 4". */
export function stepNumber(step: WizardStep): number {
  return WIZARD_STEP_IDS.indexOf(step) + 1
}
