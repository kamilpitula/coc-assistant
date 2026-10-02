/** Eras a Campaign can be set in; v1 offers the 1920s only (docs/game-rules/project_ruleset.md section 1). */
export const ERAS = ['1920s'] as const

export type Era = (typeof ERAS)[number]

/** The Era every new Campaign uses; it can't be changed after creation. */
export const DEFAULT_ERA: Era = '1920s'

/** Creation Methods in their canonical order, as named on the wire (docs/game-rules/project_ruleset.md section 2). */
export const CREATION_METHODS = ['StandardRolling', 'PointBuy', 'QuickFire'] as const

export type CreationMethod = (typeof CREATION_METHODS)[number]

export interface Campaign {
  id: string
  name: string
  keeperAccountId: string
  playerLimit: number
  era: Era
  allowedCreationMethods: CreationMethod[]
}

/** What a Keeper supplies to create a Campaign. */
export interface CreateCampaignInput {
  name: string
  playerLimit: number
  era: Era
  allowedCreationMethods: CreationMethod[]
}
