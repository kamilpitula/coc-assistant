import {
  CHARACTERISTIC_CODES,
  type CharacterSheetView,
  type ValidationError,
} from '@/campaign-play/types/CharacterSheet'

/** The creation wizard steps (specs/character-sheet/ux.md sections 1, 4.1, and 9). */
export const WIZARD_STEPS = [
  { id: 'identity', label: 'Identity' },
  { id: 'characteristics', label: 'Characteristics' },
  { id: 'age', label: 'Age effects' },
  { id: 'occupation', label: 'Occupation' },
  { id: 'occupation-skills', label: 'Occupation skills' },
  { id: 'personal-interests', label: 'Personal interests' },
  { id: 'sheet', label: 'Sheet and submit' },
] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]['id']

/** Stepper item states of ux.md section 4.1; the current step is shown on top of its state. */
export type StepState = 'completed' | 'needsAttention' | 'notStarted'

const WIZARD_STEP_IDS: readonly WizardStep[] = WIZARD_STEPS.map((step) => step.id)

export function isWizardStep(value: string): value is WizardStep {
  return WIZARD_STEP_IDS.some((step) => step === value)
}

/** Field prefixes and the step that owns them; the first match wins, so the more specific prefixes come first. */
const FIELD_OWNERS: [prefix: string, step: WizardStep][] = [
  ['identity', 'identity'],
  ['creationMethod', 'characteristics'],
  ['characteristicRolls', 'characteristics'],
  ['characteristics', 'characteristics'],
  ['luckRolls', 'characteristics'],
  ['ageEffects', 'age'],
  ['occupation.skillChoices', 'occupation-skills'],
  ['occupationPoints', 'occupation-skills'],
  ['occupation', 'occupation'],
  ['creditRating', 'occupation-skills'],
  ['quickFire.values', 'occupation-skills'],
  ['quickFire.extraSkill', 'occupation-skills'],
  ['quickFire.personalInterests', 'personal-interests'],
  ['personalInterestPoints', 'personal-interests'],
]

/** The step that owns a ValidationError field, so its error summary link can open that step. */
export function stepOfField(field: string): WizardStep {
  if (/^skills\[\d+\]\.occupationPoints$/.test(field)) {
    return 'occupation-skills'
  }

  if (field.startsWith('skills')) {
    return 'personal-interests'
  }

  return FIELD_OWNERS.find(([prefix]) => field.startsWith(prefix))?.[1] ?? 'sheet'
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== ''
}

const STARTED_BY_INPUT: Partial<Record<WizardStep, (sheet: CharacterSheetView) => boolean>> = {
  identity: (sheet) => Object.values(sheet.identity).some(hasValue),
  characteristics: (sheet) =>
    CHARACTERISTIC_CODES.some((code) => hasValue(sheet.characteristics[code].assigned)) ||
    Object.values(sheet.characteristicRolls).some(hasValue) ||
    sheet.luckRolls.some(hasValue),
  age: (sheet) =>
    Object.values(sheet.ageEffects.deductions).some(hasValue) ||
    sheet.ageEffects.eduImprovementChecks.some((check) => hasValue(check.check) || hasValue(check.gain)),
  occupation: (sheet) => sheet.occupation !== null,
  'occupation-skills': (sheet) =>
    (sheet.occupation?.skillChoices ?? []).some((picks) => picks.length > 0) ||
    sheet.skills.some((row) => hasValue(row.occupationPoints)) ||
    sheet.quickFire.values.length > 0 ||
    Boolean(sheet.quickFire.extraSkill),
  'personal-interests': (sheet) =>
    sheet.skills.some((row) => hasValue(row.personalInterestPoints)) || sheet.quickFire.personalInterests.length > 0,
}

/**
 * Each step's state, derived from the saved sheet and its errors (ux.md sections 4.1 and 5.3): a started step is
 * completed when it has no errors and needs attention otherwise. Personal interests has no required input, so it also
 * counts as started once Occupation skills is completed. Sheet and submit opens once every earlier step is completed.
 * Warnings never affect a step's state.
 */
export function stepStates(sheet: CharacterSheetView, validationErrors: ValidationError[]): Record<WizardStep, StepState> {
  const stepsWithErrors = new Set(
    validationErrors.filter((error) => error.severity === 'Error').map((error) => stepOfField(error.field)),
  )
  const stateOf = (step: WizardStep, started: boolean): StepState => {
    if (!started) {
      return 'notStarted'
    }

    return stepsWithErrors.has(step) ? 'needsAttention' : 'completed'
  }

  const states = {} as Record<WizardStep, StepState>
  for (const step of WIZARD_STEP_IDS.filter((candidate) => candidate !== 'sheet')) {
    const started = STARTED_BY_INPUT[step]?.(sheet) ?? false
    const startedByPrevious = step === 'personal-interests' && states['occupation-skills'] === 'completed'
    states[step] = stateOf(step, started || startedByPrevious)
  }

  const allCompleted = WIZARD_STEP_IDS.every((step) => step === 'sheet' || states[step] === 'completed')
  states.sheet = allCompleted ? 'completed' : 'notStarted'
  return states
}

/** The first step that is not completed, or Sheet and submit when every earlier step is (ux.md section 5.3). */
export function resumeStep(sheet: CharacterSheetView, validationErrors: ValidationError[]): WizardStep {
  const states = stepStates(sheet, validationErrors)
  return WIZARD_STEP_IDS.find((step) => step !== 'sheet' && states[step] !== 'completed') ?? 'sheet'
}

/** The 1-based position of a step, for "Step N of 7". */
export function stepNumber(step: WizardStep): number {
  return WIZARD_STEP_IDS.indexOf(step) + 1
}
