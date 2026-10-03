import type { WizardStep } from '@/campaign-play/services/wizardProgress'
import {
  CHARACTERISTIC_CODES,
  type AgeBracket,
  type CharacterSheetInputs,
  type CharacterSheetView,
  type CharacteristicCode,
  type EduImprovementCheckInputs,
  type IdentityInputs,
} from '@/campaign-play/types/CharacterSheet'

/** The changes the creation wizard makes to the Character Sheet inputs. */
export type CharacterSheetFormAction =
  | { type: 'reset'; inputs: CharacterSheetInputs }
  | { type: 'identity'; field: keyof IdentityInputs; value: string | number | null }
  | { type: 'characteristic'; code: CharacteristicCode; value: number | null }
  | { type: 'luckRoll'; index: number; value: number | null }
  | { type: 'deduction'; code: CharacteristicCode; value: number | null }
  | { type: 'eduCheck'; index: number; part: keyof EduImprovementCheckInputs; value: number | null }

/** The editable inputs of a saved sheet. Point buy is the only creation method PBI-CP-003 offers. */
export function inputsFromSheet(sheet: CharacterSheetView): CharacterSheetInputs {
  return {
    identity: { ...sheet.identity },
    creationMethod: 'PointBuy',
    characteristics: Object.fromEntries(CHARACTERISTIC_CODES.map((code) => [code, sheet.characteristics[code].assigned])),
    ageEffects: {
      deductions: { ...sheet.ageEffects.deductions },
      eduImprovementChecks: sheet.ageEffects.eduImprovementChecks.map(({ check, gain }) => ({ check, gain })),
    },
    luckRolls: [...sheet.luckRolls],
  }
}

function setAt<T>(values: readonly T[], index: number, value: T, filler: T): T[] {
  const copy = [...values]
  while (copy.length <= index) {
    copy.push(filler)
  }
  copy[index] = value
  return copy
}

export function characterSheetFormReducer(inputs: CharacterSheetInputs, action: CharacterSheetFormAction): CharacterSheetInputs {
  switch (action.type) {
    case 'reset':
      return action.inputs
    case 'identity':
      return { ...inputs, identity: { ...inputs.identity, [action.field]: action.value } }
    case 'characteristic':
      return { ...inputs, characteristics: { ...inputs.characteristics, [action.code]: action.value } }
    case 'luckRoll':
      return { ...inputs, luckRolls: setAt(inputs.luckRolls, action.index, action.value, null) }
    case 'deduction':
      return {
        ...inputs,
        ageEffects: { ...inputs.ageEffects, deductions: { ...inputs.ageEffects.deductions, [action.code]: action.value } },
      }
    case 'eduCheck': {
      const checks = inputs.ageEffects.eduImprovementChecks
      const current = checks[action.index] ?? { check: null, gain: null }
      const updated = setAt(checks, action.index, { ...current, [action.part]: action.value }, { check: null, gain: null })
      return { ...inputs, ageEffects: { ...inputs.ageEffects, eduImprovementChecks: updated } }
    }
  }
}

/**
 * The EDU each improvement check is rolled against: the assigned EDU plus the gains of earlier checks whose roll was
 * above EDU, never past `eduMaximum` (docs/game-rules coc7_character_creation_and_development_rules.md section 3.2).
 * The wizard uses it only to decide whether the "1D10 gain" input appears; the server computes the real values.
 */
export function eduBeforeEachCheck(
  assignedEducation: number | null,
  checks: EduImprovementCheckInputs[],
  eduMaximum = Number.POSITIVE_INFINITY,
): (number | null)[] {
  let education = assignedEducation
  return checks.map(({ check, gain }) => {
    const before = education
    if (before !== null && check !== null && check > before && gain !== null) {
      education = Math.min(eduMaximum, before + gain)
    }
    return before
  })
}

/**
 * The inputs to save from a step. A step saves exactly what it shows, so values for rows it no longer renders (for
 * example a second Luck roll after the age changed) are dropped when the Player saves that step.
 */
export function inputsForSave(
  inputs: CharacterSheetInputs,
  step: WizardStep,
  bracket: AgeBracket | null,
  eduMaximum?: number,
): CharacterSheetInputs {
  if (step === 'characteristics') {
    const luckRows = bracket?.luckRolls ?? 1
    return { ...inputs, luckRolls: inputs.luckRolls.slice(0, luckRows) }
  }

  if (step === 'age' && bracket) {
    return { ...inputs, ageEffects: shownAgeInputs(inputs, bracket, eduMaximum) }
  }

  return inputs
}

function shownAgeInputs(inputs: CharacterSheetInputs, bracket: AgeBracket, eduMaximum?: number): CharacterSheetInputs['ageEffects'] {
  const deductions = Object.fromEntries(
    bracket.physicalDeductionCharacteristics.flatMap((code) => {
      const value = inputs.ageEffects.deductions[code]
      return value === undefined ? [] : [[code, value]]
    }),
  )
  const checks = inputs.ageEffects.eduImprovementChecks.slice(0, bracket.eduImprovementChecks)
  const before = eduBeforeEachCheck(inputs.characteristics.EDU ?? null, checks, eduMaximum)
  const shownChecks = checks.map((check, index) => {
    const educationBefore = before[index]
    const gainShown = check.check !== null && educationBefore !== null && check.check > educationBefore
    return gainShown ? check : { ...check, gain: null }
  })

  return { deductions, eduImprovementChecks: shownChecks }
}
