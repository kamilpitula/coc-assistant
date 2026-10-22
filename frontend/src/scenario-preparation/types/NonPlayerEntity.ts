/** The wire types of a Non-Player Entity. */
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

/**
 * Where each type's profile page is: its route and the name of the route's id parameter. A lookup rather than a switch,
 * so a link to a profile never branches on the type (design record PBI-SP-004, Patterns).
 */
export const NON_PLAYER_ENTITY_PROFILE_PATHS = {
  HumanNpc: { to: '/campaigns/$campaignId/human-npcs/$humanNpcId', idParam: 'humanNpcId' },
  MythosCreature: { to: '/campaigns/$campaignId/mythos-creatures/$mythosCreatureId', idParam: 'mythosCreatureId' },
} as const satisfies Record<NonPlayerEntityType, { to: string; idParam: string }>

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
