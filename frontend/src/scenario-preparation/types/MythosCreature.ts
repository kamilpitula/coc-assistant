import type { InvestigatorDifficulty } from '@/scenario-preparation/types/NonPlayerEntity'
import type { RichTextDocument } from '@/shared/types/RichText'

/** The Creature Kinds a Mythos Creature may have (CONTEXT.md; project_ruleset.md section 5.1). */
export const CREATURE_KINDS = ['Beast', 'Folklore', 'Mythos', 'Unique'] as const
export type CreatureKind = (typeof CREATURE_KINDS)[number]

/** The movement modes a Monster Profile may list (project_ruleset.md section 5.4). */
export const MOVEMENT_MODES = ['Walk', 'Swim', 'Fly', 'Burrow', 'Other'] as const
export type MovementMode = (typeof MOVEMENT_MODES)[number]

/** The characteristic codes of a Monster Profile in rule order; APP and EDU are added by the Keeper only (project_ruleset.md section 5.2). */
export const MONSTER_CHARACTERISTIC_CODES = ['STR', 'CON', 'SIZ', 'DEX', 'INT', 'POW', 'APP', 'EDU'] as const
export type MonsterCharacteristicCode = (typeof MONSTER_CHARACTERISTIC_CODES)[number]

export interface MonsterDetails {
  creatureKind: CreatureKind | null
  descriptionAndSensoryCues: string | null
  origin: string | null
  goalAndBehavior: string | null
  signsAndTraces: string | null
  defeatOutcome: string | null
  specimenRangeNotes: string | null
}

/** A Derived Value Override with the reason it differs from the rules; the server never replaces the computed value with it. */
export interface MonsterNumberOverride {
  value: number | null
  reason: string | null
}

export interface MonsterDamageBonusOverride {
  value: string | null
  reason: string | null
}

export interface MonsterOverrides {
  hitPoints: MonsterNumberOverride | null
  magicPoints: MonsterNumberOverride | null
  damageBonus: MonsterDamageBonusOverride | null
  build: MonsterNumberOverride | null
}

/** Worked out by the server; each is null when the characteristics it needs are not entered. There is no MOV. */
export interface MonsterDerivedValues {
  hitPoints: number | null
  magicPoints: number | null
  damageBonus: string | null
  build: number | null
}

export interface MonsterCharacteristics {
  values: Partial<Record<string, number | null>>
  hitPointsNotApplicable: boolean
  overrides: MonsterOverrides
  difficulty: Partial<Record<string, InvestigatorDifficulty>>
  derived: MonsterDerivedValues
}

export interface MonsterMovementMode {
  mode: MovementMode
  label: string | null
  rate: number | null
}

export interface MonsterAttack {
  name: string | null
  skill: string | null
  skillValue: number | null
  difficulty: InvestigatorDifficulty
  damage: string | null
  effect: string | null
  manoeuvre: boolean
}

export interface MonsterCombat {
  attacksPerRound: number | null
  dodge: number | null
  dodgeDifficulty: InvestigatorDifficulty | null
  attacks: MonsterAttack[]
}

export interface MonsterDefenseEntry {
  description: string | null
}

export interface MonsterDefenses {
  armorPoints: number | null
  armorNote: string | null
  immunities: MonsterDefenseEntry[]
  vulnerabilities: MonsterDefenseEntry[]
}

export interface MonsterSkill {
  name: string | null
  value: number | null
  difficulty: InvestigatorDifficulty
}

export interface MonsterSpell {
  name: string | null
  magicPointCost: string | null
  effect: string | null
}

export interface MonsterPower extends MonsterSpell {
  limits: string | null
}

export interface MonsterSanityLoss {
  value: string | null
}

/** A Mythos Creature with its Monster Profile as the server returns it. A null section was not added. */
export interface MythosCreature {
  id: string
  name: string
  details: MonsterDetails
  keeperNotes: RichTextDocument | null
  characteristics: MonsterCharacteristics | null
  movement: MonsterMovementMode[] | null
  combat: MonsterCombat | null
  defenses: MonsterDefenses | null
  skills: MonsterSkill[] | null
  spells: MonsterSpell[] | null
  powers: MonsterPower[] | null
  sanityLoss: MonsterSanityLoss | null
}

/** What a save sends: the profile without anything the server works out. */
export interface MythosCreatureInput {
  name: string
  details: MonsterDetails
  keeperNotes: RichTextDocument | null
  characteristics: {
    values: Record<string, number | null>
    hitPointsNotApplicable: boolean
    overrides: MonsterOverrides
  } | null
  movement: MonsterMovementMode[] | null
  combat: {
    attacksPerRound: number | null
    dodge: number | null
    attacks: Omit<MonsterAttack, 'difficulty'>[]
  } | null
  defenses: MonsterDefenses | null
  skills: Omit<MonsterSkill, 'difficulty'>[] | null
  spells: MonsterSpell[] | null
  powers: MonsterPower[] | null
  sanityLoss: MonsterSanityLoss | null
}
