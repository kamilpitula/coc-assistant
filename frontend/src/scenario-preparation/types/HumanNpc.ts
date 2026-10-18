import type { RichTextDocument } from '@/shared/types/RichText'

/** The Investigator Difficulty the server works out for an Opposing Value (CONTEXT.md). */
export type InvestigatorDifficulty = 'Regular' | 'Hard' | 'Extreme'

/** The characteristic codes in rule order. */
export const CHARACTERISTIC_CODES = ['STR', 'CON', 'DEX', 'APP', 'POW', 'SIZ', 'INT', 'EDU'] as const
export type CharacteristicCode = (typeof CHARACTERISTIC_CODES)[number]

export const CHARACTERISTIC_NAMES: Record<CharacteristicCode, string> = {
  STR: 'Strength',
  CON: 'Constitution',
  DEX: 'Dexterity',
  APP: 'Appearance',
  POW: 'Power',
  SIZ: 'Size',
  INT: 'Intelligence',
  EDU: 'Education',
}

export interface HumanNpcDetails {
  professionOrRole: string | null
  shortDescription: string | null
  goal: string | null
  relationshipToInvestigators: string | null
  knowledge: string | null
  secrets: string | null
  behaviorCue: string | null
}

/** Worked out by the server; each is null when the characteristics it needs are not entered. */
export interface DerivedValues {
  hitPoints: number | null
  magicPoints: number | null
  damageBonus: string | null
  build: number | null
  movementRate: number | null
  movementRateNotCovered: boolean
}

export interface HumanNpcCharacteristics {
  values: Partial<Record<string, number | null>>
  difficulty: Partial<Record<string, InvestigatorDifficulty>>
  derived: DerivedValues
}

export interface HumanNpcSkill {
  name: string | null
  specialization: string | null
  value: number | null
  difficulty: InvestigatorDifficulty
}

export interface HumanNpcWeapon {
  name: string | null
  skill: { name: string | null; specialization: string | null } | null
  damage: string | null
  attacksPerRound: number | null
  range: string | null
  ammunition: string | null
  malfunction: string | null
  impaling: boolean
}

export interface HumanNpcCombat {
  dodge: number | null
  dodgeDifficulty: InvestigatorDifficulty | null
  armorPoints: number | null
  tacticsAndMorale: string | null
  weapons: HumanNpcWeapon[]
}

export interface HumanNpcSpell {
  name: string | null
  magicPointCost: string | null
  effect: string | null
}

/** A Human NPC with its NPC Profile as the server returns it. A null section was not added. */
export interface HumanNpc {
  id: string
  name: string
  age: number | null
  details: HumanNpcDetails
  keeperNotes: RichTextDocument | null
  characteristics: HumanNpcCharacteristics | null
  skills: HumanNpcSkill[] | null
  combat: HumanNpcCombat | null
  spells: HumanNpcSpell[] | null
}

/** What a save sends: the profile without anything the server works out. */
export interface HumanNpcInput {
  name: string
  age: number | null
  details: HumanNpcDetails
  keeperNotes: RichTextDocument | null
  characteristics: Record<string, number | null> | null
  skills: { name: string | null; specialization: string | null; value: number | null }[] | null
  combat: {
    dodge: number | null
    armorPoints: number | null
    tacticsAndMorale: string | null
    weapons: HumanNpcWeapon[]
  } | null
  spells: HumanNpcSpell[] | null
}

/** One refused value from a 400: the lower-cased request path and the server's messages. */
export interface ValidationProblem {
  path: string
  messages: string[]
}
