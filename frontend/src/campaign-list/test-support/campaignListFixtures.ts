import type { KeeperCampaignListItem, PlayerCampaignListItem } from '@/campaign-list/types/CampaignListItem'

/** A Keeper item with Players, one Approved Investigator, and two awaiting review (spec Scenario, CL-UX-3). */
export const keeperListItem: KeeperCampaignListItem = {
  id: 'c1',
  name: 'The Haunting',
  era: '1920s',
  role: 'Keeper',
  playerCount: 3,
  playerLimit: 8,
  approvedInvestigatorCount: 1,
  awaitingReviewCount: 2,
}

/** A Player item whose own Investigator has Changes Requested (spec Scenario, CL-UX-4). */
export const playerListItem: PlayerCampaignListItem = {
  id: 'c2',
  name: 'Horror on the Orient Express',
  era: '1920s',
  role: 'Player',
  keeperName: 'Anna K.',
  playerCount: 5,
  approvedInvestigatorCount: 4,
  myInvestigator: { status: 'ChangesRequested', name: 'Harvey Walters' },
}
