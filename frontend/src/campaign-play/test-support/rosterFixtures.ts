import type { Campaign, PlayerCampaign } from '@/campaign-play/types/Campaign'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'

/** Story and test rosters for the Campaign overview (specs/campaign-overview/ux.md sections 4 and 5). */
export const STORY_CAMPAIGN_ID = 'story-campaign'

export const keeperCampaign: Campaign = {
  id: STORY_CAMPAIGN_ID,
  name: 'Haunting of Corbitt House',
  keeperAccountId: 'story-keeper',
  playerLimit: 8,
  era: '1920s',
  allowedCreationMethods: ['PointBuy'],
  role: 'Keeper',
}

export const playerCampaign: PlayerCampaign = {
  id: STORY_CAMPAIGN_ID,
  name: 'Haunting of Corbitt House',
  era: '1920s',
  allowedCreationMethods: ['PointBuy'],
  role: 'Player',
}

const keeper = (isYou: boolean): CampaignMember => ({
  memberId: 'k',
  displayName: 'Eleanor Hart',
  role: 'Keeper',
  isYou,
  investigator: null,
})

/** The Keeper's view with a Submitted, a Draft, an Approved, and a Player without an Investigator. */
export const keeperRosterWithReviews: CampaignMember[] = [
  keeper(true),
  {
    memberId: 'a',
    displayName: 'Ana Ruiz',
    role: 'Player',
    isYou: false,
    investigator: { visibility: 'Visible', id: 'i-a', name: 'Dr. Ames', status: 'Submitted' },
  },
  { memberId: 'b', displayName: 'Ben Cole', role: 'Player', isYou: false, investigator: { visibility: 'InProgress' } },
  {
    memberId: 'c',
    displayName: 'Cleo Park',
    role: 'Player',
    isYou: false,
    investigator: { visibility: 'Visible', id: 'i-c', name: 'Mae Doyle', status: 'Approved' },
  },
  { memberId: 'd', displayName: 'Dan Moss', role: 'Player', isYou: false, investigator: null },
]

export const keeperRosterWithoutPlayers: CampaignMember[] = [keeper(true)]

export const keeperRosterAllApproved: CampaignMember[] = [
  keeper(true),
  {
    memberId: 'a',
    displayName: 'Ana Ruiz',
    role: 'Player',
    isYou: false,
    investigator: { visibility: 'Visible', id: 'i-a', name: 'Dr. Ames', status: 'Approved' },
  },
  {
    memberId: 'c',
    displayName: 'Cleo Park',
    role: 'Player',
    isYou: false,
    investigator: { visibility: 'Visible', id: 'i-c', name: 'Mae Doyle', status: 'Approved' },
  },
]

/** A Player's view: their own Draft, another Player's Approved, and one not ready yet. */
export const playerRoster: CampaignMember[] = [
  keeper(false),
  { memberId: 'y', displayName: 'Sam Okafor', role: 'Player', isYou: true, investigator: { visibility: 'Visible', name: null, status: 'Draft' } },
  {
    memberId: 'c',
    displayName: 'Cleo Park',
    role: 'Player',
    isYou: false,
    investigator: { visibility: 'Visible', name: 'Mae Doyle', status: 'Approved' },
  },
  { memberId: 'a', displayName: 'Ana Ruiz', role: 'Player', isYou: false, investigator: { visibility: 'NotReady' } },
]

/** The largest Campaign: the Keeper and sixteen Players with long names. */
export const largeRoster: CampaignMember[] = [
  { ...keeper(true), displayName: 'Eleanor Augusta Hartwell-Pemberton of Arkham' },
  ...Array.from(
    { length: 16 },
    (_, index): CampaignMember => ({
      memberId: `p${index}`,
      displayName: `Investigator-minded Player Number ${index + 1} With A Rather Long Display Name`,
      role: 'Player',
      isYou: false,
      investigator:
        index % 2 === 0
          ? { visibility: 'Visible', id: `i${index}`, name: `Professor Bartholomew Whitcombe the ${index + 1}th`, status: 'Submitted' }
          : { visibility: 'InProgress' },
    }),
  ),
]
