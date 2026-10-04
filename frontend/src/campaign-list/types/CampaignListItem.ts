import type { Era } from '@/campaign-play/types/Campaign'
import type { InvestigatorStatus } from '@/campaign-play/types/Investigator'

/** A Campaign the caller runs as its Keeper (specs/campaign-list/spec.md, Item content by role). */
export interface KeeperCampaignListItem {
  id: string
  name: string
  era: Era
  role: 'Keeper'
  playerCount: number
  playerLimit: number
  approvedInvestigatorCount: number
  awaitingReviewCount: number
}

/** The caller's own Investigator on a Player item; name is null while unnamed. */
export interface MyInvestigator {
  status: InvestigatorStatus
  name: string | null
}

/** A Campaign the caller plays in; it carries no Player limit and no awaiting-review count. */
export interface PlayerCampaignListItem {
  id: string
  name: string
  era: Era
  role: 'Player'
  keeperName: string
  playerCount: number
  approvedInvestigatorCount: number
  myInvestigator: MyInvestigator | null
}

/** One entry of GET /api/campaigns, told apart by `role`. */
export type CampaignListItem = KeeperCampaignListItem | PlayerCampaignListItem
