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

/** The body of PUT .../investigators/mine/character-sheet: the Player's inputs only; dice results are raw totals. */
export interface CharacterSheetInputs {
  identity: IdentityInputs
  creationMethod: CreationMethod | null
  characteristics: CharacteristicInputs
  ageEffects: {
    deductions: CharacteristicInputs
    eduImprovementChecks: EduImprovementCheckInputs[]
  }
  luckRolls: (number | null)[]
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

export interface DerivedValues {
  luck: number | null
  hitPoints: number | null
  magicPoints: number | null
  sanity: { current: number | null; maximum: number | null }
  dodge: number | null
  movementRate: number | null
  damageBonus: string | null
  build: number | null
}

export interface RollRecord {
  purpose: string
  dice: string
  result: number
  source: string
}

/** The Character Sheet view, shared by the Player's sheet and the Keeper's review. */
export interface CharacterSheetView {
  schemaVersion: number
  identity: IdentityInputs
  creationMethod: CreationMethod | null
  characteristics: Record<CharacteristicCode, CharacteristicView>
  ageEffects: {
    bracket: AgeBracket | null
    deductions: CharacteristicInputs
    eduImprovementChecks: EduImprovementCheckView[]
  }
  luckRolls: (number | null)[]
  derived: DerivedValues
  rollRecords: RollRecord[]
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
