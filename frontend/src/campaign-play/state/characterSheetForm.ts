import type { WizardStep } from '@/campaign-play/services/wizardProgress'
import type { CreationMethod } from '@/campaign-play/types/Campaign'
import {
  BACKSTORY_ENTRIES,
  CHARACTERISTIC_CODES,
  type AgeBracket,
  type BackstoryEntry,
  type BackstoryInputs,
  type BackstoryKey,
  type CharacterSheetInputs,
  type CharacterSheetRules,
  type CharacterSheetView,
  type CharacteristicCode,
  type CharacteristicInputs,
  type CustomOccupationInputs,
  type CustomWeaponInputs,
  type EduImprovementCheckView,
  type IdentityInputs,
  type QuickFireInputs,
  type SkillAllocationInputs,
  type SkillReference,
} from '@/campaign-play/types/CharacterSheet'
import type { SavedRolls } from '@/campaign-play/services/characterSheetValidation'

export type SkillPointsColumn = 'occupationPoints' | 'personalInterestPoints'

/** The changes the creation wizard makes to the Character Sheet inputs. */
export type CharacterSheetFormAction =
  | { type: 'reset'; inputs: CharacterSheetInputs }
  | { type: 'identity'; field: keyof IdentityInputs; value: string | number | null }
  | { type: 'creationMethod'; method: CreationMethod }
  | { type: 'characteristic'; code: CharacteristicCode; value: number | null }
  | { type: 'deduction'; code: CharacteristicCode; value: number | null }
  | { type: 'occupation'; catalogId: string | null; custom: CustomOccupationInputs | null }
  | { type: 'formulaCharacteristic'; index: number; value: string | null }
  | { type: 'skillChoice'; slot: number; picks: SkillReference[] }
  | { type: 'skillPoints'; skill: SkillReference; column: SkillPointsColumn; value: number | null }
  | { type: 'quickFireValue'; skill: SkillReference; value: number | null }
  | { type: 'quickFireInterest'; skill: SkillReference; chosen: boolean }
  | { type: 'quickFireExtraSkill'; skill: SkillReference | null }
  | { type: 'backstory'; key: BackstoryKey; value: string | null }
  | { type: 'keyConnection'; entry: BackstoryEntry | null }
  | { type: 'addWeapon' }
  | { type: 'weapon'; index: number; field: keyof CustomWeaponInputs; value: string | null }
  | { type: 'removeWeapon'; index: number }
  | { type: 'gear'; value: string | null }

const NO_QUICK_FIRE: QuickFireInputs = { values: [], personalInterests: [], extraSkill: null }

/** A Backstory with nothing filled in (docs/game-rules section 12). */
export const EMPTY_BACKSTORY: BackstoryInputs = Object.fromEntries(
  ['myStory', ...BACKSTORY_ENTRIES].map((key) => [key, null]),
) as BackstoryInputs

const EMPTY_WEAPON: CustomWeaponInputs = { name: null, skill: null, damage: null, attacks: null, range: null, ammo: null, malfunction: null }

/** True when a Backstory text has content; a blank text is not filled in. */
export function isFilled(text: string | null | undefined): boolean {
  return Boolean(text?.trim())
}

/** True when two skill references name the same skill (names compare without regard to case). */
export function sameSkill(first: SkillReference, second: SkillReference): boolean {
  const same = (left: string | null, right: string | null) =>
    left === right || (left !== null && right !== null && left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0)
  return same(first.skill, second.skill) && same(first.specialization, second.specialization)
}

/** The editable inputs of a saved sheet; computed values are left out. */
export function inputsFromSheet(sheet: CharacterSheetView): CharacterSheetInputs {
  return {
    identity: { ...sheet.identity },
    creationMethod: sheet.creationMethod,
    // Every method starts from the saved assigned values, including the server-rolled ones under Standard rolling;
    // the PUT drops them again for Standard rolling (methodInputsOnly), because the server owns those values.
    characteristics: Object.fromEntries(
      CHARACTERISTIC_CODES.map((code) => [code, sheet.characteristics[code].assigned]),
    ) as CharacteristicInputs,
    ageEffects: {
      deductions: { ...sheet.ageEffects.deductions },
    },
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
    backstory: { ...sheet.backstory },
    keyConnection: sheet.keyConnection,
    weapons: sheet.weapons.map(({ name, skill, damage, attacks, range, ammo, malfunction }) => ({ name, skill, damage, attacks, range, ammo, malfunction })),
    gear: sheet.gear,
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

/** True when the Player has entered any characteristic value, so switching method needs confirmation (ux.md 5.5). */
export function hasCharacteristicInputs(inputs: CharacterSheetInputs): boolean {
  return Object.values(inputs.characteristics).some((value) => value !== null && value !== undefined)
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

// Section 12: emptying the Key Connection's entry clears the choice (ux.md section 6.7).
function withBackstory(inputs: CharacterSheetInputs, key: BackstoryKey, value: string | null): CharacterSheetInputs {
  const clearsKeyConnection = key === inputs.keyConnection && !isFilled(value)
  return { ...inputs, backstory: { ...inputs.backstory, [key]: value }, keyConnection: clearsKeyConnection ? null : inputs.keyConnection }
}

function backstoryAndPossessionsReducer(inputs: CharacterSheetInputs, action: CharacterSheetFormAction): CharacterSheetInputs {
  switch (action.type) {
    case 'backstory':
      return withBackstory(inputs, action.key, action.value)
    case 'keyConnection':
      return { ...inputs, keyConnection: action.entry }
    case 'addWeapon':
      return { ...inputs, weapons: [...inputs.weapons, EMPTY_WEAPON] }
    case 'weapon':
      return { ...inputs, weapons: inputs.weapons.map((weapon, index) => (index === action.index ? { ...weapon, [action.field]: action.value } : weapon)) }
    case 'removeWeapon':
      return { ...inputs, weapons: inputs.weapons.filter((_, index) => index !== action.index) }
    case 'gear':
      return { ...inputs, gear: action.value }
    default:
      return inputs
  }
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
      return backstoryAndPossessionsReducer(inputs, action)
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
    case 'deduction': {
      return {
        ...inputs,
        ageEffects: { ...inputs.ageEffects, deductions: { ...inputs.ageEffects.deductions, [action.code]: action.value } },
      }
    }
    default:
      return occupationReducer(inputs, action)
  }
}

/**
 * True when the assigned EDU is one the Creation Method can produce, the prerequisite for rolling an EDU check
 * (design D3; the server refuses anything else with 409). Point buy reads the assigned value; Quick fire reads it
 * from the pool; Standard rolling reads the stored roll record, since its assigned values are server-rolled.
 */
export function hasUsableEdu(
  inputs: CharacterSheetInputs,
  characteristicRolls: CharacteristicInputs,
  rules: CharacterSheetRules,
): boolean {
  switch (inputs.creationMethod) {
    case 'PointBuy':
      return pointBuyEduUsable(inputs.characteristics.EDU ?? null, rules)
    case 'QuickFire':
      return quickFireEduUsable(inputs.characteristics.EDU ?? null, rules)
    case 'StandardRolling':
      return standardRollingEduUsable(characteristicRolls.EDU ?? null, rules.standardRolling.EDU.dice)
    default:
      return false
  }
}

function pointBuyEduUsable(assigned: number | null, rules: CharacterSheetRules): boolean {
  return assigned !== null && assigned >= rules.pointBuyMinimum && assigned <= rules.pointBuyMaximum
}

function quickFireEduUsable(assigned: number | null, rules: CharacterSheetRules): boolean {
  return assigned !== null && rules.quickFireCharacteristicValues.includes(assigned)
}

function standardRollingEduUsable(roll: number | null, dice: string): boolean {
  if (roll === null) {
    return false
  }

  const [countText, sidesText] = dice.split('D')
  const count = countText === '' ? 1 : Number(countText)
  return roll >= count && roll <= count * Number(sidesText)
}

/**
 * The EDU each improvement check is rolled against: the assigned EDU plus the gains of earlier checks whose roll was
 * above EDU, never past `eduMaximum` (docs/game-rules coc7_character_creation_and_development_rules.md section 3.2).
 * The dialog of the next roll action shows its "{eduBefore}"; the server computes the real values.
 */
export function eduBeforeEachCheck(
  assignedEducation: number | null,
  checks: EduImprovementCheckView[],
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

// Only the selected method's inputs are saved (specs/character-sheet/spec.md, API Contracts). Under Standard rolling
// the characteristics are the saved assigned values for display, but the PUT never carries them: the server owns them.
function methodInputsOnly(inputs: CharacterSheetInputs): CharacterSheetInputs {
  const rolling = inputs.creationMethod === 'StandardRolling'
  const quickFire = inputs.creationMethod === 'QuickFire'
  return {
    ...inputs,
    characteristics: rolling ? {} : inputs.characteristics,
    skills: quickFire ? [] : inputs.skills,
    quickFire: quickFire ? inputs.quickFire : NO_QUICK_FIRE,
  }
}

/**
 * The inputs to save from a step. A step saves exactly what it shows for the deductions, so values for rows it no
 * longer renders (for example a deduction from characteristics the new bracket no longer names) are dropped when the
 * Player saves that step. Inputs of another Creation Method are never saved. Dice results are never saved: the server
 * owns every Roll Record.
 */
export function inputsForSave(
  inputs: CharacterSheetInputs,
  step: WizardStep,
  bracket: AgeBracket | null,
): CharacterSheetInputs {
  const methodInputs = methodInputsOnly(inputs)
  if (step === 'age' && bracket) {
    return { ...methodInputs, ageEffects: { deductions: shownDeductions(inputs, bracket) } }
  }

  return methodInputs
}

function shownDeductions(inputs: CharacterSheetInputs, bracket: AgeBracket): CharacteristicInputs {
  return Object.fromEntries(
    bracket.physicalDeductionCharacteristics.flatMap((code) => {
      const value = inputs.ageEffects.deductions[code]
      return value === undefined ? [] : [[code, value]]
    }),
  )
}

/** The saved rolls the validator reads instead of typed dice results, built from the Character Sheet view. */
export function savedRollsFromSheet(sheet: CharacterSheetView): SavedRolls {
  return {
    characteristicRolls: sheet.characteristicRolls,
    luckRolls: sheet.luckRolls,
    eduImprovementChecks: sheet.ageEffects.eduImprovementChecks,
    lockedAgeBracket: sheet.locks.ageBracket ? sheet.ageEffects.bracket : null,
  }
}
