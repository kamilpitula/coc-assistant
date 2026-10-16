import { EMPTY_BACKSTORY } from '@/campaign-play/state/characterSheetForm'
import type {
  AgeBracket,
  CharacterSheetInputs,
  CharacterSheetRules,
  CharacterSheetView,
  CharacteristicCode,
  OccupationInputs,
  SkillReference,
  SkillRow,
  ValidationError,
} from '@/campaign-play/types/CharacterSheet'
import type { KeeperInvestigator, MyCharacterSheet } from '@/campaign-play/types/Investigator'
import type { OccupationCatalog, SkillCatalog } from '@/campaign-play/types/RuleData'

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
  standardRolling: {
    STR: { dice: '3D6', bonus: 0, multiplier: 5 },
    CON: { dice: '3D6', bonus: 0, multiplier: 5 },
    DEX: { dice: '3D6', bonus: 0, multiplier: 5 },
    APP: { dice: '3D6', bonus: 0, multiplier: 5 },
    POW: { dice: '3D6', bonus: 0, multiplier: 5 },
    SIZ: { dice: '2D6', bonus: 6, multiplier: 5 },
    INT: { dice: '2D6', bonus: 6, multiplier: 5 },
    EDU: { dice: '2D6', bonus: 6, multiplier: 5 },
  },
  quickFireCharacteristicValues: [40, 50, 50, 50, 60, 60, 70, 80],
  quickFireSkillValues: [70, 60, 60, 50, 50, 50, 40, 40, 40],
  quickFirePersonalInterestBonus: 20,
  quickFirePersonalInterestCount: 4,
  occupationPointFormulas: [
    { id: 'EDUx4', terms: [{ characteristics: ['EDU'], multiplier: 4 }] },
    { id: 'EDUx2+DEXx2', terms: [{ characteristics: ['EDU'], multiplier: 2 }, { characteristics: ['DEX'], multiplier: 2 }] },
    {
      id: 'EDUx2+APP|DEX|STRx2',
      terms: [{ characteristics: ['EDU'], multiplier: 2 }, { characteristics: ['APP', 'DEX', 'STR'], multiplier: 2 }],
    },
  ],
  customOccupationSkillCount: 8,
  creditRatingMinimum: 0,
  creditRatingMaximum: 99,
  skillValueWarningThreshold: 90,
  creditRatingSkill: 'Credit Rating',
  cthulhuMythosSkill: 'Cthulhu Mythos',
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

export function skill(name: string, specialization: string | null = null): SkillReference {
  return { skill: name, specialization }
}

/** The 1920s Antiquarian with a pick for every open slot (docs/game-rules catalogs/occupations.1920s.json). */
export const antiquarianInputs: OccupationInputs = {
  catalogId: 'antiquarian',
  custom: null,
  formulaCharacteristics: [],
  skillChoices: [[], [skill('Art/Craft', 'Painting')], [], [], [skill('Language (Other)', 'Latin')], [skill('Charm')], [], [skill('Firearms', 'Handgun')]],
}

export const validInputs: CharacterSheetInputs = {
  identity: { name: 'Harvey Walters', age: 25, gender: null, residence: 'Boston', birthplace: null },
  creationMethod: 'PointBuy',
  characteristics: { ...pointBuy },
  characteristicRolls: {},
  ageEffects: { deductions: {}, eduImprovementChecks: [{ check: 30, gain: null }] },
  luckRolls: [11],
  occupation: antiquarianInputs,
  skills: [
    { ...skill('Credit Rating'), occupationPoints: 30, personalInterestPoints: null },
    { ...skill('Library Use'), occupationPoints: 50, personalInterestPoints: null },
    { ...skill('Drive Auto'), occupationPoints: null, personalInterestPoints: 60 },
  ],
  quickFire: { values: [], personalInterests: [] },
  backstory: EMPTY_BACKSTORY,
  keyConnection: null,
  weapons: [],
  gear: null,
}

export const emptyInputs: CharacterSheetInputs = {
  identity: { name: null, age: null, gender: null, residence: null, birthplace: null },
  creationMethod: 'PointBuy',
  characteristics: {},
  characteristicRolls: {},
  ageEffects: { deductions: {}, eduImprovementChecks: [] },
  luckRolls: [],
  occupation: null,
  skills: [],
  quickFire: { values: [], personalInterests: [] },
  backstory: EMPTY_BACKSTORY,
  keyConnection: null,
  weapons: [],
  gear: null,
}

function row(name: string, base: number, isOccupationSkill = false, specialization: string | null = null): SkillRow {
  return {
    skill: name,
    specialization,
    base,
    occupationPoints: null,
    personalInterestPoints: null,
    value: base,
    hard: Math.floor(base / 2),
    extreme: Math.floor(base / 5),
    isOccupationSkill,
  }
}

/** A few skill rows as the API returns them for the valid Antiquarian. */
export const skillRows: SkillRow[] = [
  { ...row('Credit Rating', 0), occupationPoints: 30, value: 30, hard: 15, extreme: 6 },
  row('Appraise', 5, true),
  row('Charm', 15, true),
  { ...row('Library Use', 20, true), occupationPoints: 50, value: 70, hard: 35, extreme: 14 },
  row('Cthulhu Mythos', 0),
  { ...row('Drive Auto', 20), personalInterestPoints: 60, value: 80, hard: 40, extreme: 16 },
  row('Listen', 20),
  row('Firearms', 20, true, 'Handgun'),
]

export const occupationCatalog: OccupationCatalog = {
  era: '1920s',
  skillGroups: {
    interpersonal: [
      { kind: 'skill', skill: 'Charm' },
      { kind: 'skill', skill: 'Fast Talk' },
      { kind: 'skill', skill: 'Intimidate' },
      { kind: 'skill', skill: 'Persuade' },
    ],
  },
  occupations: [
    {
      id: 'antiquarian',
      name: 'Antiquarian',
      creditRatingMin: 30,
      creditRatingMax: 70,
      occupationPointFormula: { terms: [{ characteristics: ['EDU'], multiplier: 4 }] },
      skillSlots: [
        { kind: 'skill', skill: 'Appraise' },
        { kind: 'skill', skill: 'Art/Craft', specialization: 'any' },
        { kind: 'skill', skill: 'History' },
        { kind: 'skill', skill: 'Library Use' },
        { kind: 'skill', skill: 'Language (Other)', specialization: 'any' },
        { kind: 'group', choose: 1, group: 'interpersonal' },
        { kind: 'skill', skill: 'Spot Hidden' },
        { kind: 'any', choose: 1 },
      ],
    },
    {
      id: 'police-detective',
      name: 'Police Detective',
      creditRatingMin: 20,
      creditRatingMax: 50,
      occupationPointFormula: { terms: [{ characteristics: ['EDU'], multiplier: 2 }, { characteristics: ['DEX', 'STR'], multiplier: 2 }] },
      skillSlots: [
        { kind: 'choice', choose: 1, from: [{ kind: 'skill', skill: 'Art/Craft', specialization: 'Acting' }, { kind: 'skill', skill: 'Disguise' }] },
        { kind: 'skill', skill: 'Firearms', specialization: 'any' },
        { kind: 'skill', skill: 'Law' },
        { kind: 'skill', skill: 'Listen' },
        { kind: 'group', choose: 1, group: 'interpersonal' },
        { kind: 'skill', skill: 'Psychology' },
        { kind: 'skill', skill: 'Spot Hidden' },
        { kind: 'any', choose: 1 },
      ],
    },
  ],
}

export const skillCatalog: SkillCatalog = {
  era: '1920s',
  skills: [
    { skill: 'Appraise', specialization: null, base: { kind: 'fixed', value: 5 } },
    { skill: 'Art/Craft', specialization: null, base: { kind: 'fixed', value: 5 } },
    { skill: 'Charm', specialization: null, base: { kind: 'fixed', value: 15 } },
    { skill: 'Credit Rating', specialization: null, base: { kind: 'fixed', value: 0 } },
    { skill: 'Cthulhu Mythos', specialization: null, base: { kind: 'fixed', value: 0 } },
    { skill: 'Dodge', specialization: null, base: { kind: 'characteristic', characteristic: 'DEX', divisor: 2 } },
    { skill: 'Drive Auto', specialization: null, base: { kind: 'fixed', value: 20 } },
    { skill: 'Fast Talk', specialization: null, base: { kind: 'fixed', value: 5 } },
    { skill: 'History', specialization: null, base: { kind: 'fixed', value: 5 } },
    { skill: 'Language (Other)', specialization: null, base: { kind: 'fixed', value: 1 } },
    { skill: 'Library Use', specialization: null, base: { kind: 'fixed', value: 20 } },
    { skill: 'Listen', specialization: null, base: { kind: 'fixed', value: 20 } },
    { skill: 'Persuade', specialization: null, base: { kind: 'fixed', value: 10 } },
    { skill: 'Spot Hidden', specialization: null, base: { kind: 'fixed', value: 25 } },
  ],
  closedFamilies: [
    {
      skill: 'Firearms',
      specializations: [
        { specialization: 'Handgun', base: { kind: 'fixed', value: 20 } },
        { specialization: 'Rifle/Shotgun', base: { kind: 'fixed', value: 25 } },
      ],
    },
  ],
  openFamilies: ['Art/Craft', 'Language (Other)'],
  specializationSuggestions: { 'Art/Craft': ['Acting', 'Photography'], 'Language (Other)': ['Latin'], Firearms: ['Handgun', 'Rifle/Shotgun'] },
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
    schemaVersion: 2,
    identity: validInputs.identity,
    creationMethod: 'PointBuy',
    characteristics,
    characteristicRolls: {},
    ageEffects: {
      bracket: bracket25,
      deductions: {},
      eduImprovementChecks: [{ check: 30, gain: null, eduBefore: 50, eduAfter: 50 }],
    },
    luckRolls: [11],
    occupation: { ...antiquarianInputs, name: 'Antiquarian', creditRatingMin: 30, creditRatingMax: 70, isCustom: false, formulaId: 'EDUx4', quickFireCreditRating: { value: 30, freedValue: 40 } },
    skills: skillRows,
    quickFire: { values: [], personalInterests: [], extraSkill: null },
    backstory: EMPTY_BACKSTORY,
    keyConnection: null,
    weapons: [],
    gear: null,
    derived: {
      luck: 55,
      idea: 60,
      know: 50,
      hitPoints: 12,
      magicPoints: 12,
      sanity: { current: 60, maximum: 99 },
      dodge: 30,
      movementRate: 8,
      damageBonus: '0',
      build: 0,
      occupationPoints: { budget: 200, spent: 80, left: 120 },
      personalInterestPoints: { budget: 120, spent: 60, left: 60 },
      creditRating: 30,
      wealth: { currency: 'USD', spendingLevel: { amount: 10, orMore: false }, cash: { amount: 60, orMore: false }, assets: { amount: 1500, orMore: false } },
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
    occupation: null,
    skills: [],
    derived: {
      luck: null,
      idea: null,
      know: null,
      hitPoints: null,
      magicPoints: null,
      sanity: { current: null, maximum: null },
      dodge: null,
      movementRate: null,
      damageBonus: null,
      build: null,
      occupationPoints: null,
      personalInterestPoints: null,
      creditRating: null,
      wealth: null,
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
