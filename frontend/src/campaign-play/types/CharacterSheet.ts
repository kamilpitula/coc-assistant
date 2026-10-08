import type { CreationMethod } from '@/campaign-play/types/Campaign'

/**
 * Character Sheet shapes of specs/character-sheet/spec.md (API Contracts). Rule values never appear here; they
 * arrive from the API in `CharacterSheetRules` and the age bracket.
 */

/** The eight characteristic codes, in rule order (docs/game-rules section 2). */
export const CHARACTERISTIC_CODES = ['STR', 'CON', 'DEX', 'APP', 'POW', 'SIZ', 'INT', 'EDU'] as const

export type CharacteristicCode = (typeof CHARACTERISTIC_CODES)[number]

export type CharacteristicInputs = Partial<Record<CharacteristicCode, number | null>>

export interface IdentityInputs {
  name: string | null
  age: number | null
  gender: string | null
  residence: string | null
  birthplace: string | null
}

export interface EduImprovementCheckInputs {
  check: number | null
  gain: number | null
}

/** A skill, optionally with its specialization (docs/game-rules section 6). */
export interface SkillReference {
  skill: string
  specialization: string | null
}

/** A Player-defined Occupation (specs/character-sheet/spec.md, Occupation). */
export interface CustomOccupationInputs {
  name: string | null
  formulaId: string | null
  skills: (SkillReference | null)[]
  creditRatingMin: number | null
  creditRatingMax: number | null
}

/** A catalog or custom Occupation, the formula picks per term, and the picks per occupation skill slot. */
export interface OccupationInputs {
  catalogId: string | null
  custom: CustomOccupationInputs | null
  formulaCharacteristics: (string | null)[]
  skillChoices: SkillReference[][]
}

/** Occupation and personal interest points on one skill (Standard rolling and Point buy). */
export interface SkillAllocationInputs extends SkillReference {
  occupationPoints: number | null
  personalInterestPoints: number | null
}

export interface QuickFireValueInputs extends SkillReference {
  value: number | null
}

/** The Quick fire skill assignment (docs/game-rules section 18). */
export interface QuickFireInputs {
  values: QuickFireValueInputs[]
  personalInterests: SkillReference[]
  /** The skill that takes the value Credit Rating frees (section 18); absent or null when none is chosen. */
  extraSkill?: SkillReference | null
}

/** The body of PUT .../investigators/mine/character-sheet: the Player's inputs only; dice results are raw totals. */
export interface CharacterSheetInputs {
  identity: IdentityInputs
  creationMethod: CreationMethod | null
  characteristics: CharacteristicInputs
  characteristicRolls: CharacteristicInputs
  ageEffects: {
    deductions: CharacteristicInputs
    eduImprovementChecks: EduImprovementCheckInputs[]
  }
  luckRolls: (number | null)[]
  occupation: OccupationInputs | null
  skills: SkillAllocationInputs[]
  quickFire: QuickFireInputs
}

export interface CharacteristicView {
  assigned: number | null
  value: number | null
  hard: number | null
  extreme: number | null
}

/** The applicable age bracket (docs/game-rules catalogs/age-rules.json), as the API returns it. */
export interface AgeBracket {
  minimumAge: number
  maximumAge: number
  physicalDeductionTotal: number
  physicalDeductionCharacteristics: CharacteristicCode[]
  appearanceModifier: number
  eduImprovementChecks: number
  luckRolls: number
}

export interface EduImprovementCheckView {
  check: number | null
  gain: number | null
  eduBefore: number | null
  eduAfter: number | null
}

export interface PointBudget {
  budget: number
  spent: number
  left: number
}

export interface MoneyAmount {
  amount: number
  orMore: boolean
}

export interface Wealth {
  currency: string
  spendingLevel: MoneyAmount
  cash: MoneyAmount
  assets: MoneyAmount | null
}

export interface DerivedValues {
  luck: number | null
  hitPoints: number | null
  magicPoints: number | null
  sanity: { current: number | null; maximum: number | null }
  dodge: number | null
  movementRate: number | null
  damageBonus: string | null
  build: number | null
  occupationPoints: PointBudget | null
  personalInterestPoints: PointBudget | null
  creditRating: number | null
  wealth: Wealth | null
}

export interface RollRecord {
  purpose: string
  dice: string
  result: number
  source: string
}

/** The Occupation inputs plus what they resolve to; resolved values are null while unknown. */
export interface OccupationView extends OccupationInputs {
  name: string | null
  creditRatingMin: number | null
  creditRatingMax: number | null
  isCustom: boolean
  formulaId: string | null
  /** The Credit Rating a Quick fire Investigator takes and the value it frees (docs/game-rules section 18). */
  quickFireCreditRating: { value: number; freedValue: number | null } | null
}

/** One skill on the sheet (docs/game-rules section 9). */
export interface SkillRow extends SkillReference {
  base: number | null
  occupationPoints: number | null
  personalInterestPoints: number | null
  value: number | null
  hard: number | null
  extreme: number | null
  isOccupationSkill: boolean
}

/** The Character Sheet view, shared by the Player's sheet and the Keeper's review. */
export interface CharacterSheetView {
  schemaVersion: number
  identity: IdentityInputs
  creationMethod: CreationMethod | null
  characteristics: Record<CharacteristicCode, CharacteristicView>
  characteristicRolls: CharacteristicInputs
  ageEffects: {
    bracket: AgeBracket | null
    deductions: CharacteristicInputs
    eduImprovementChecks: EduImprovementCheckView[]
  }
  luckRolls: (number | null)[]
  occupation: OccupationView | null
  skills: SkillRow[]
  quickFire: QuickFireInputs
  derived: DerivedValues
  rollRecords: RollRecord[]
}

/** A Standard rolling formula: (raw dice total + bonus) x multiplier (docs/game-rules section 2.1). */
export interface CharacteristicRollFormula {
  dice: string
  bonus: number
  multiplier: number
}

export interface OccupationPointTerm {
  characteristics: string[]
  multiplier: number
}

/** A docs/game-rules section 7.1 formula with its id. */
export interface OccupationPointFormulaOption {
  id: string
  terms: OccupationPointTerm[]
}

/** Rule parameters from the API, so the frontend never hard-codes a rule value. */
export interface CharacterSheetRules {
  pointBuyBudget: number
  pointBuyMinimum: number
  pointBuyMaximum: number
  pointBuyRecommendedMinimum: number
  minimumAge: number
  maximumAge: number
  characteristicFloor: number
  luckDice: string
  eduImprovementCheckDice: string
  eduImprovementGainDice: string
  /** EDU never improves past this value (section 3.2). */
  eduMaximum: number
  /** A raw Luck roll times this is the Luck value (section 5.5). */
  luckMultiplier: number
  standardRolling: Record<CharacteristicCode, CharacteristicRollFormula>
  quickFireCharacteristicValues: number[]
  quickFireSkillValues: number[]
  quickFirePersonalInterestBonus: number
  quickFirePersonalInterestCount: number
  occupationPointFormulas: OccupationPointFormulaOption[]
  customOccupationSkillCount: number
  creditRatingMinimum: number
  creditRatingMaximum: number
  skillValueWarningThreshold: number
  creditRatingSkill: string
  cthulhuMythosSkill: string
}

export type ValidationSeverity = 'Error' | 'Warning'

/** A Character Sheet problem (docs/game-rules section 15; catalog in specs/character-sheet/spec.md). */
export interface ValidationError {
  code: string
  field: string
  message: string
  expected: string | null
  actual: string | null
  severity: ValidationSeverity
}
