export interface Campaign {
  id: string
  name: string
  keeperAccountId: string
  playerLimit: number
}

/** What a Keeper supplies to create a Campaign. */
export interface CreateCampaignInput {
  name: string
  playerLimit: number
}
