import { useCampaignMembers } from '@/campaign-play/hooks/useCampaignMembers'
import { approvedInvestigatorNames } from '@/campaign-play/services/investigatorNames'

/**
 * The Approved Investigators' names by id (PBI-SPL-003): the client resolves an Item holder's name from the roster.
 * Names are undefined while the roster loads; a roster failure surfaces so the caller shows an error with a retry
 * instead of spinning forever.
 */
export function useApprovedInvestigatorNames(campaignId: string): {
  names: Map<string, string> | undefined
  isError: boolean
  refetch: () => void
} {
  const members = useCampaignMembers(campaignId)
  const refetch = () => {
    void members.refetch()
  }

  if (members.data === undefined) {
    return { names: undefined, isError: members.isError, refetch }
  }

  return { names: approvedInvestigatorNames(members.data), isError: false, refetch }
}
