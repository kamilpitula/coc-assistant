import type { CampaignListItem } from '@/campaign-list/types/CampaignListItem'

// The Campaign List item copy (specs/campaign-list/ux.md section 6, Content).

/** Joined Players: with the limit for the Keeper, without it for a Player. */
export function playersCopy(item: CampaignListItem): string {
  if (item.role === 'Keeper') {
    return `${item.playerCount} of ${item.playerLimit} Players`
  }
  return item.playerCount === 1 ? '1 Player' : `${item.playerCount} Players`
}

/** The Approved Investigators count. */
export function approvedCopy(count: number): string {
  if (count === 0) {
    return 'No Investigators approved yet'
  }
  return count === 1 ? '1 Investigator approved' : `${count} Investigators approved`
}

/** The Era, followed by the Keeper's name on a Player item. */
export function detailsCopy(item: CampaignListItem): string {
  return item.role === 'Player' ? `${item.era}, Keeper: ${item.keeperName}` : item.era
}

/** The Player's own Investigator by name. */
export function ownInvestigatorCopy(name: string | null): string {
  return `Your Investigator: ${name ?? 'unnamed'}`
}
