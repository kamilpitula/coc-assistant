/** Eras a Campaign can be set in; v1 offers the 1920s only (docs/game-rules/project_ruleset.md section 1). */
export const ERAS = ['1920s'] as const

export type Era = (typeof ERAS)[number]

/** The Era every new Campaign uses; it can't be changed after creation. */
export const DEFAULT_ERA: Era = '1920s'

/** Creation Methods in their canonical order, as named on the wire (docs/game-rules/project_ruleset.md section 2). */
export const CREATION_METHODS = ['StandardRolling', 'PointBuy', 'QuickFire'] as const

export type CreationMethod = (typeof CREATION_METHODS)[number]

/** The caller's role in a Campaign (CONTEXT.md: Keeper, Player). */
export type CampaignRole = 'Keeper' | 'Player'

/** The Keeper's view of a Campaign. */
export interface Campaign {
  id: string
  name: string
  keeperAccountId: string
  playerLimit: number
  era: Era
  allowedCreationMethods: CreationMethod[]
  role: 'Keeper'
}

/** A Player's reduced view of a Campaign; it carries no Keeper-only data. */
export interface PlayerCampaign {
  id: string
  name: string
  era: Era
  allowedCreationMethods: CreationMethod[]
  role: 'Player'
}

/** What GET /api/campaigns/{id} returns to a member, depending on their role. */
export type CampaignView = Campaign | PlayerCampaign

/** What a Keeper supplies to create a Campaign. */
export interface CreateCampaignInput {
  name: string
  playerLimit: number
  era: Era
  allowedCreationMethods: CreationMethod[]
}
