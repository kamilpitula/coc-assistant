import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import { useInvestigatorClues, useMyClues, useRevealAnnouncement } from '@/scene-play/hooks/useReveals'
import type { Clues } from '@/scene-play/types/Reveal'

function useCluesAnnouncement(clues: Clues | null | undefined, announce: boolean, isFetchedAfterMount: boolean) {
  return useRevealAnnouncement(announce ? clues?.clues : undefined, clues?.investigatorName ?? null, isFetchedAfterMount)
}

/**
 * The Clues the page may read (specs/scene-play/ux.md section 15): a Player reads their own, the Keeper reads the Investigator named
 * by the route, and the wrong role reads nothing and sends no request. `wrongRole` is true once the Campaign has loaded and the
 * caller is not who the route is for. The Player's page announces new arrivals politely.
 */
export function useCluesRead(campaignId: string, investigatorId: string | undefined) {
  const role = useCampaign(campaignId).data?.role
  const isKeeperRoute = investigatorId !== undefined
  const roleMatches = role === (isKeeperRoute ? 'Keeper' : 'Player')
  const mine = useMyClues(campaignId, roleMatches && !isKeeperRoute)
  const theirs = useInvestigatorClues(campaignId, investigatorId ?? '', roleMatches && isKeeperRoute)
  const query = isKeeperRoute ? theirs : mine
  const announcement = useCluesAnnouncement(query.data, !isKeeperRoute, query.isFetchedAfterMount)

  return { query, announcement, isKeeperRoute, wrongRole: role !== undefined && !roleMatches }
}
