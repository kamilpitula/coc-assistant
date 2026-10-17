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
