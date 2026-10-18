/** The wire types of a Non-Player Entity; the list accepts Mythos Creatures although PBI-SP-009 adds their pages later. */
export type NonPlayerEntityType = 'HumanNpc' | 'MythosCreature'

/** One row of the Campaign's Non-Player Entity list. */
export interface NonPlayerEntitySummary {
  id: string
  type: NonPlayerEntityType
  name: string
}

/** The type filter of the list page. */
export type NonPlayerEntityTypeFilter = 'All' | NonPlayerEntityType

/** The label of each type in UI copy; never "NPC" alone (specs/scenario-preparation/ux.md section 21). */
export const NON_PLAYER_ENTITY_TYPE_LABELS: Record<NonPlayerEntityType, string> = {
  HumanNpc: 'Human NPC',
  MythosCreature: 'Mythos Creature',
}

/** The longest Non-Player Entity name and the age range (specs/scenario-preparation/spec.md; project_ruleset.md section 5.2). */
export const NON_PLAYER_ENTITY_NAME_MAX_LENGTH = 200
export const HUMAN_NPC_AGE_MAXIMUM = 150

/** The Investigator Difficulty the server works out for an Opposing Value (CONTEXT.md). */
export type InvestigatorDifficulty = 'Regular' | 'Hard' | 'Extreme'

export type CharacteristicCode = 'STR' | 'CON' | 'DEX' | 'APP' | 'POW' | 'SIZ' | 'INT' | 'EDU'

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
