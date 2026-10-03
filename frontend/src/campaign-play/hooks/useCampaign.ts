import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  campaignQueryKeys,
  changeAllowedCreationMethods,
  getCampaign,
} from '@/campaign-play/services/campaignApi'
import type { CreationMethod } from '@/campaign-play/types/Campaign'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/**
 * Loads the Campaign as its member sees it: the Keeper view or the Player view, told apart by `role`. Resolves to null
 * for anyone who is not a member (the API answers 404).
 */
export function useCampaign(campaignId: string) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: campaignQueryKeys.detail(campaignId),
    queryFn: async () => getCampaign(await getAccessToken(), campaignId),
  })
}

/** Replaces the Campaign's allowed Creation Methods (Keeper only) and stores the updated Campaign in the cache. */
export function useChangeAllowedCreationMethods(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (allowedCreationMethods: CreationMethod[]) =>
      changeAllowedCreationMethods(await getAccessToken(), campaignId, allowedCreationMethods),
    onSuccess: (campaign) => queryClient.setQueryData(campaignQueryKeys.detail(campaignId), campaign),
  })
}
