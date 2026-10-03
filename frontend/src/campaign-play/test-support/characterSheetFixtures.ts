import type {
  AgeBracket,
  CharacterSheetInputs,
  CharacterSheetRules,
  CharacterSheetView,
  CharacteristicCode,
  ValidationError,
} from '@/campaign-play/types/CharacterSheet'
import type { KeeperInvestigator, MyCharacterSheet } from '@/campaign-play/types/Investigator'

/**
 * Character Sheet data for tests and stories, shaped like the API's responses. Rule values mirror what the API returns
 * (specs/character-sheet/validation-fixtures.json "rules"); they are test data, not a second source of rules.
 */
export const rules: CharacterSheetRules = {
  pointBuyBudget: 460,
  pointBuyMinimum: 15,
  pointBuyMaximum: 90,
  pointBuyRecommendedMinimum: 40,
  minimumAge: 15,
  maximumAge: 89,
  characteristicFloor: 0,
  luckDice: '3D6',
  eduImprovementCheckDice: 'D100',
  eduImprovementGainDice: '1D10',
  eduMaximum: 99,
  luckMultiplier: 5,
}

export const bracket17: AgeBracket = {
  minimumAge: 15,
  maximumAge: 19,
  physicalDeductionTotal: 5,
  physicalDeductionCharacteristics: ['STR', 'SIZ'],
  appearanceModifier: 0,
  eduImprovementChecks: 0,
  luckRolls: 2,
}

export const bracket25: AgeBracket = {
  minimumAge: 20,
  maximumAge: 39,
  physicalDeductionTotal: 0,
  physicalDeductionCharacteristics: [],
  appearanceModifier: 0,
  eduImprovementChecks: 1,
  luckRolls: 1,
}

export const bracket45: AgeBracket = {
  minimumAge: 40,
  maximumAge: 49,
  physicalDeductionTotal: 5,
  physicalDeductionCharacteristics: ['STR', 'CON', 'DEX'],
  appearanceModifier: -5,
  eduImprovementChecks: 2,
  luckRolls: 1,
}

const pointBuy: Record<CharacteristicCode, number> = {
  STR: 60,
  CON: 60,
  DEX: 60,
  APP: 50,
  POW: 60,
  SIZ: 60,
  INT: 60,
  EDU: 50,
}

export const validInputs: CharacterSheetInputs = {
  identity: { name: 'Harvey Walters', age: 25, gender: null, residence: 'Boston', birthplace: null },
  creationMethod: 'PointBuy',
  characteristics: { ...pointBuy },
  ageEffects: { deductions: {}, eduImprovementChecks: [{ check: 30, gain: null }] },
  luckRolls: [11],
}

export const emptyInputs: CharacterSheetInputs = {
  identity: { name: null, age: null, gender: null, residence: null, birthplace: null },
  creationMethod: 'PointBuy',
  characteristics: {},
  ageEffects: { deductions: {}, eduImprovementChecks: [] },
  luckRolls: [],
}

/** A computed sheet for a valid 25-year-old (no age deduction, one EDU check that does not improve EDU). */
export function sheetView(overrides: Partial<CharacterSheetView> = {}): CharacterSheetView {
  const characteristics = Object.fromEntries(
    (Object.keys(pointBuy) as CharacteristicCode[]).map((code) => [
      code,
      { assigned: pointBuy[code], value: pointBuy[code], hard: Math.floor(pointBuy[code] / 2), extreme: Math.floor(pointBuy[code] / 5) },
    ]),
  ) as CharacterSheetView['characteristics']

  return {
    schemaVersion: 1,
    identity: validInputs.identity,
    creationMethod: 'PointBuy',
    characteristics,
    ageEffects: {
      bracket: bracket25,
      deductions: {},
      eduImprovementChecks: [{ check: 30, gain: null, eduBefore: 50, eduAfter: 50 }],
    },
    luckRolls: [11],
    derived: {
      luck: 55,
      hitPoints: 12,
      magicPoints: 12,
      sanity: { current: 60, maximum: 99 },
      dodge: 30,
      movementRate: 8,
      damageBonus: '0',
      build: 0,
    },
    rollRecords: [
      { purpose: 'Luck', dice: '3D6', result: 11, source: 'PlayerEntered' },
      { purpose: 'EduImprovement[1].Check', dice: 'D100', result: 30, source: 'PlayerEntered' },
    ],
    ...overrides,
  }
}

/** An empty Draft as returned right after "Create Investigator". */
export function emptySheetView(): CharacterSheetView {
  const empty = { assigned: null, value: null, hard: null, extreme: null }
  return sheetView({
    identity: emptyInputs.identity,
    creationMethod: null,
    characteristics: { STR: empty, CON: empty, DEX: empty, APP: empty, POW: empty, SIZ: empty, INT: empty, EDU: empty },
    ageEffects: { bracket: null, deductions: {}, eduImprovementChecks: [] },
    luckRolls: [],
    derived: {
      luck: null,
      hitPoints: null,
      magicPoints: null,
      sanity: { current: null, maximum: null },
      dodge: null,
      movementRate: null,
      damageBonus: null,
      build: null,
    },
    rollRecords: [],
  })
}

export function problem(code: string, field: string, message: string, severity: 'Error' | 'Warning' = 'Error'): ValidationError {
  return { code, field, message, expected: null, actual: null, severity }
}

export function myCharacterSheet(overrides: Partial<MyCharacterSheet> = {}): MyCharacterSheet {
  return {
    investigatorId: 'i1',
    status: 'Draft',
    playerName: 'Ada Lovelace',
    changeRequestComment: null,
    characterSheet: sheetView(),
    rules,
    validationErrors: [],
    ...overrides,
  }
}

export function keeperInvestigator(overrides: Partial<KeeperInvestigator> = {}): KeeperInvestigator {
  return {
    id: 'i1',
    status: 'Submitted',
    playerName: 'Ada Lovelace',
    changeRequestComment: null,
    updatedAt: '2026-10-02T12:00:00+00:00',
    characterSheet: sheetView(),
    warnings: [],
    ...overrides,
  }
}
