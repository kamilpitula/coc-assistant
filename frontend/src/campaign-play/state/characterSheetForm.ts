import type { WizardStep } from '@/campaign-play/services/wizardProgress'
import type { CreationMethod } from '@/campaign-play/types/Campaign'
import {
  CHARACTERISTIC_CODES,
  type AgeBracket,
  type CharacterSheetInputs,
  type CharacterSheetRules,
  type CharacterSheetView,
  type CharacteristicCode,
  type CustomOccupationInputs,
  type EduImprovementCheckInputs,
  type IdentityInputs,
  type QuickFireInputs,
  type SkillAllocationInputs,
  type SkillReference,
} from '@/campaign-play/types/CharacterSheet'

export type SkillPointsColumn = 'occupationPoints' | 'personalInterestPoints'

/** The changes the creation wizard makes to the Character Sheet inputs. */
export type CharacterSheetFormAction =
  | { type: 'reset'; inputs: CharacterSheetInputs }
  | { type: 'identity'; field: keyof IdentityInputs; value: string | number | null }
  | { type: 'creationMethod'; method: CreationMethod }
  | { type: 'characteristic'; code: CharacteristicCode; value: number | null }
  | { type: 'characteristicRoll'; code: CharacteristicCode; value: number | null }
  | { type: 'luckRoll'; index: number; value: number | null }
  | { type: 'deduction'; code: CharacteristicCode; value: number | null }
  | { type: 'eduCheck'; index: number; part: keyof EduImprovementCheckInputs; value: number | null }
  | { type: 'occupation'; catalogId: string | null; custom: CustomOccupationInputs | null }
  | { type: 'formulaCharacteristic'; index: number; value: string | null }
  | { type: 'skillChoice'; slot: number; picks: SkillReference[] }
  | { type: 'skillPoints'; skill: SkillReference; column: SkillPointsColumn; value: number | null }
  | { type: 'quickFireValue'; skill: SkillReference; value: number | null }
  | { type: 'quickFireInterest'; skill: SkillReference; chosen: boolean }
  | { type: 'quickFireExtraSkill'; skill: SkillReference | null }

const NO_QUICK_FIRE: QuickFireInputs = { values: [], personalInterests: [], extraSkill: null }

/** True when two skill references name the same skill (names compare without regard to case). */
export function sameSkill(first: SkillReference, second: SkillReference): boolean {
  const same = (left: string | null, right: string | null) =>
    left === right || (left !== null && right !== null && left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0)
  return same(first.skill, second.skill) && same(first.specialization, second.specialization)
}

/** The editable inputs of a saved sheet; computed values are left out. */
export function inputsFromSheet(sheet: CharacterSheetView): CharacterSheetInputs {
  const rolling = sheet.creationMethod === 'StandardRolling'
  return {
    identity: { ...sheet.identity },
    creationMethod: sheet.creationMethod,
    characteristics: rolling ? {} : Object.fromEntries(CHARACTERISTIC_CODES.map((code) => [code, sheet.characteristics[code].assigned])),
    characteristicRolls: { ...sheet.characteristicRolls },
    ageEffects: {
      deductions: { ...sheet.ageEffects.deductions },
      eduImprovementChecks: sheet.ageEffects.eduImprovementChecks.map(({ check, gain }) => ({ check, gain })),
    },
    luckRolls: [...sheet.luckRolls],
    occupation: sheet.occupation
      ? {
          catalogId: sheet.occupation.catalogId,
          custom: sheet.occupation.custom,
          formulaCharacteristics: [...sheet.occupation.formulaCharacteristics],
          skillChoices: sheet.occupation.skillChoices.map((picks) => [...picks]),
        }
      : null,
    skills: sheet.skills
      .filter((row) => row.occupationPoints !== null || row.personalInterestPoints !== null)
      .map(({ skill, specialization, occupationPoints, personalInterestPoints }) => ({ skill, specialization, occupationPoints, personalInterestPoints })),
    quickFire: {
      values: [...sheet.quickFire.values],
      personalInterests: [...sheet.quickFire.personalInterests],
      extraSkill: sheet.quickFire.extraSkill ?? null,
    },
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

/** True when the Player has entered any characteristic value or roll, so switching method needs confirmation (ux.md 5.5). */
export function hasCharacteristicInputs(inputs: CharacterSheetInputs): boolean {
  return [...Object.values(inputs.characteristics), ...Object.values(inputs.characteristicRolls)].some((value) => value !== null && value !== undefined)
}

/**
 * True when switching to `method` also clears skill inputs: Quick fire's skill assignment is never mixed with
 * occupation and personal interest points (docs/game-rules section 2.3).
 */
export function clearsSkillInputs(inputs: CharacterSheetInputs, method: CreationMethod): boolean {
  const toQuickFire = method === 'QuickFire' && inputs.creationMethod !== 'QuickFire'
  const fromQuickFire = method !== 'QuickFire' && inputs.creationMethod === 'QuickFire'
  return (toQuickFire && inputs.skills.length > 0) || (fromQuickFire && hasQuickFireInputs(inputs.quickFire))
}

function hasQuickFireInputs(quickFire: QuickFireInputs): boolean {
  return quickFire.values.length > 0 || quickFire.personalInterests.length > 0 || Boolean(quickFire.extraSkill)
}

// ux.md section 5.5: switching clears the characteristics, and the other method's skill inputs when Quick fire is involved.
function withCreationMethod(inputs: CharacterSheetInputs, method: CreationMethod): CharacterSheetInputs {
  return {
    ...inputs,
    creationMethod: method,
    characteristics: {},
    characteristicRolls: {},
    skills: method === 'QuickFire' ? [] : inputs.skills,
    quickFire: method === 'QuickFire' ? inputs.quickFire : NO_QUICK_FIRE,
  }
}

function withOccupation(inputs: CharacterSheetInputs, change: (occupation: NonNullable<CharacterSheetInputs['occupation']>) => Partial<NonNullable<CharacterSheetInputs['occupation']>>): CharacterSheetInputs {
  const current = inputs.occupation ?? { catalogId: null, custom: null, formulaCharacteristics: [], skillChoices: [] }
  return { ...inputs, occupation: { ...current, ...change(current) } }
}

function withSkillPoints(skills: SkillAllocationInputs[], skill: SkillReference, column: SkillPointsColumn, value: number | null): SkillAllocationInputs[] {
  const existing = skills.find((candidate) => sameSkill(candidate, skill))
  const updated: SkillAllocationInputs = {
    skill: skill.skill,
    specialization: skill.specialization,
    occupationPoints: existing?.occupationPoints ?? null,
    personalInterestPoints: existing?.personalInterestPoints ?? null,
    [column]: value,
  }
  const others = skills.filter((candidate) => candidate !== existing)
  if (updated.occupationPoints === null && updated.personalInterestPoints === null) {
    return others
  }

  return existing ? skills.map((candidate) => (candidate === existing ? updated : candidate)) : [...skills, updated]
}

function withQuickFireValue(quickFire: QuickFireInputs, skill: SkillReference, value: number | null): QuickFireInputs {
  const others = quickFire.values.filter((candidate) => !sameSkill(candidate, skill))
  const values = value === null ? others : quickFire.values.some((candidate) => sameSkill(candidate, skill))
    ? quickFire.values.map((candidate) => (sameSkill(candidate, skill) ? { ...candidate, value } : candidate))
    : [...quickFire.values, { skill: skill.skill, specialization: skill.specialization, value }]
  return { ...quickFire, values }
}

function withQuickFireInterest(quickFire: QuickFireInputs, skill: SkillReference, chosen: boolean): QuickFireInputs {
  const others = quickFire.personalInterests.filter((candidate) => !sameSkill(candidate, skill))
  return { ...quickFire, personalInterests: chosen ? [...others, { skill: skill.skill, specialization: skill.specialization }] : others }
}

function occupationReducer(inputs: CharacterSheetInputs, action: CharacterSheetFormAction): CharacterSheetInputs {
  switch (action.type) {
    case 'occupation':
      return withOccupation(inputs, () => ({ catalogId: action.catalogId, custom: action.custom }))
    case 'formulaCharacteristic':
      return withOccupation(inputs, (current) => ({ formulaCharacteristics: setAt(current.formulaCharacteristics, action.index, action.value, null) }))
    case 'skillChoice':
      return withOccupation(inputs, (current) => ({ skillChoices: setAt(current.skillChoices, action.slot, action.picks, []) }))
    case 'skillPoints':
      return { ...inputs, skills: withSkillPoints(inputs.skills, action.skill, action.column, action.value) }
    case 'quickFireValue':
      return { ...inputs, quickFire: withQuickFireValue(inputs.quickFire, action.skill, action.value) }
    case 'quickFireInterest':
      return { ...inputs, quickFire: withQuickFireInterest(inputs.quickFire, action.skill, action.chosen) }
    case 'quickFireExtraSkill':
      return {
        ...inputs,
        quickFire: { ...inputs.quickFire, extraSkill: action.skill ? { skill: action.skill.skill, specialization: action.skill.specialization } : null },
      }
    default:
      return inputs
  }
}

export function characterSheetFormReducer(inputs: CharacterSheetInputs, action: CharacterSheetFormAction): CharacterSheetInputs {
  switch (action.type) {
    case 'reset':
      return action.inputs
    case 'identity':
      return { ...inputs, identity: { ...inputs.identity, [action.field]: action.value } }
    case 'creationMethod':
      return withCreationMethod(inputs, action.method)
    case 'characteristic':
      return { ...inputs, characteristics: { ...inputs.characteristics, [action.code]: action.value } }
    case 'characteristicRoll':
      return { ...inputs, characteristicRolls: { ...inputs.characteristicRolls, [action.code]: action.value } }
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
    default:
      return occupationReducer(inputs, action)
  }
}

/**
 * The value a characteristic starts from before age effects: assigned (Point buy, Quick fire) or computed from its
 * Standard rolling roll (docs/game-rules section 2.1). The wizard uses it for display only; the server computes the
 * real values.
 */
export function assignedValue(inputs: CharacterSheetInputs, code: CharacteristicCode, rules: CharacterSheetRules): number | null {
  if (inputs.creationMethod !== 'StandardRolling') {
    return inputs.characteristics[code] ?? null
  }

  const roll = inputs.characteristicRolls[code] ?? null
  const formula = rules.standardRolling[code]
  return roll === null ? null : (roll + formula.bonus) * formula.multiplier
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

// Only the selected method's inputs are saved (specs/character-sheet/spec.md, API Contracts).
function methodInputsOnly(inputs: CharacterSheetInputs): CharacterSheetInputs {
  const rolling = inputs.creationMethod === 'StandardRolling'
  const quickFire = inputs.creationMethod === 'QuickFire'
  return {
    ...inputs,
    characteristics: rolling ? {} : inputs.characteristics,
    characteristicRolls: rolling ? inputs.characteristicRolls : {},
    skills: quickFire ? [] : inputs.skills,
    quickFire: quickFire ? inputs.quickFire : NO_QUICK_FIRE,
  }
}

/**
 * The inputs to save from a step. A step saves exactly what it shows, so values for rows it no longer renders (for
 * example a second Luck roll after the age changed) are dropped when the Player saves that step. Inputs of another
 * Creation Method are never saved.
 */
export function inputsForSave(
  inputs: CharacterSheetInputs,
  step: WizardStep,
  bracket: AgeBracket | null,
  rules: CharacterSheetRules,
): CharacterSheetInputs {
  const methodInputs = methodInputsOnly(inputs)
  if (step === 'characteristics') {
    const luckRows = bracket?.luckRolls ?? 1
    return { ...methodInputs, luckRolls: methodInputs.luckRolls.slice(0, luckRows) }
  }

  if (step === 'age' && bracket) {
    return { ...methodInputs, ageEffects: shownAgeInputs(methodInputs, bracket, rules) }
  }

  return methodInputs
}

function shownAgeInputs(inputs: CharacterSheetInputs, bracket: AgeBracket, rules: CharacterSheetRules): CharacterSheetInputs['ageEffects'] {
  const deductions = Object.fromEntries(
    bracket.physicalDeductionCharacteristics.flatMap((code) => {
      const value = inputs.ageEffects.deductions[code]
      return value === undefined ? [] : [[code, value]]
    }),
  )
  const checks = inputs.ageEffects.eduImprovementChecks.slice(0, bracket.eduImprovementChecks)
  const before = eduBeforeEachCheck(assignedValue(inputs, 'EDU', rules), checks, rules.eduMaximum)
  const shownChecks = checks.map((check, index) => {
    const educationBefore = before[index]
    const gainShown = check.check !== null && educationBefore !== null && check.check > educationBefore
    return gainShown ? check : { ...check, gain: null }
  })

  return { deductions, eduImprovementChecks: shownChecks }
}
