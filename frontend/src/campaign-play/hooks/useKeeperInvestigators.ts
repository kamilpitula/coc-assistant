import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import {
  approveInvestigator,
  getInvestigatorForKeeper,
  requestChanges,
} from '@/campaign-play/services/investigatorApi'
import type { KeeperInvestigator } from '@/campaign-play/types/Investigator'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** A non-Draft Investigator for the Keeper's review; null outside the Keeper's visibility. */
export function useKeeperInvestigator(campaignId: string, investigatorId: string) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: campaignQueryKeys.investigator(campaignId, investigatorId),
    queryFn: async () => getInvestigatorForKeeper(await getAccessToken(), campaignId, investigatorId),
  })
}

function useStoreReviewedInvestigator(campaignId: string, investigatorId: string) {
  const queryClient = useQueryClient()

  return (investigator: KeeperInvestigator) => {
    queryClient.setQueryData(campaignQueryKeys.investigator(campaignId, investigatorId), investigator)
    return queryClient.invalidateQueries({ queryKey: campaignQueryKeys.investigators(campaignId), exact: true })
  }
}

/** Character Approval. */
export function useApproveInvestigator(campaignId: string, investigatorId: string) {
  const getAccessToken = useAccessToken()
  const store = useStoreReviewedInvestigator(campaignId, investigatorId)

  return useMutation({
    mutationFn: async () => approveInvestigator(await getAccessToken(), campaignId, investigatorId),
    onSuccess: store,
  })
}

/** Returns the Investigator to its Player with the Keeper's comment. */
export function useRequestChanges(campaignId: string, investigatorId: string) {
  const getAccessToken = useAccessToken()
  const store = useStoreReviewedInvestigator(campaignId, investigatorId)

  return useMutation({
    mutationFn: async (comment: string) => requestChanges(await getAccessToken(), campaignId, investigatorId, comment),
    onSuccess: store,
  })
}
