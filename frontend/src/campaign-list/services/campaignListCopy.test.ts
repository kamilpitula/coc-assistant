import { describe, expect, it } from 'vitest'

import type { KeeperCampaignListItem, PlayerCampaignListItem } from '@/campaign-list/types/CampaignListItem'

import { approvedCopy, detailsCopy, ownInvestigatorCopy, playersCopy } from './campaignListCopy'

// specs/campaign-list/ux.md section 6, Content.

const keeperItem: KeeperCampaignListItem = {
  id: 'c1',
  name: 'The Haunting',
  era: '1920s',
  role: 'Keeper',
  playerCount: 3,
  playerLimit: 8,
  approvedInvestigatorCount: 1,
  awaitingReviewCount: 2,
}

const playerItem: PlayerCampaignListItem = {
  id: 'c2',
  name: 'Horror on the Orient Express',
  era: '1920s',
  role: 'Player',
  keeperName: 'Anna K.',
  playerCount: 5,
  approvedInvestigatorCount: 4,
  myInvestigator: null,
}

describe('campaignListCopy', () => {
  it.each([
    [keeperItem, '3 of 8 Players'],
    [{ ...keeperItem, playerCount: 0 }, '0 of 8 Players'],
    [playerItem, '5 Players'],
    [{ ...playerItem, playerCount: 1 }, '1 Player'],
  ])('counts the Players of %o as "%s"', (item, expected) => {
    expect(playersCopy(item)).toBe(expected)
  })

  it.each([
    [0, 'No Investigators approved yet'],
    [1, '1 Investigator approved'],
    [4, '4 Investigators approved'],
  ])('reads %i Approved Investigators as "%s"', (count, expected) => {
    expect(approvedCopy(count)).toBe(expected)
  })

  it('shows the Era for a Keeper item and the Era and the Keeper for a Player item', () => {
    expect(detailsCopy(keeperItem)).toBe('1920s')
    expect(detailsCopy(playerItem)).toBe('1920s, Keeper: Anna K.')
  })

  it('names the own Investigator, or calls it unnamed', () => {
    expect(ownInvestigatorCopy('Harvey Walters')).toBe('Your Investigator: Harvey Walters')
    expect(ownInvestigatorCopy(null)).toBe('Your Investigator: unnamed')
  })
})
