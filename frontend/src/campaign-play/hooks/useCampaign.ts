import { useMsal } from '@azure/msal-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  campaignQueryKeys,
  changeAllowedCreationMethods,
  getCampaign,
} from '@/campaign-play/services/campaignApi'
import type { CreationMethod } from '@/campaign-play/types/Campaign'
import { apiScope } from '@/shared/services/msalConfig'

/**
 * Loads the Campaign for its Keeper. Resolves to null when the caller is not the Keeper (the API answers 404),
 * which is how the Campaign page tells the Keeper apart from everyone else.
 */
export function useCampaign(campaignId: string) {
  const { instance, accounts } = useMsal()
  const activeAccount = accounts[0]

  return useQuery({
    queryKey: campaignQueryKeys.detail(campaignId),
    queryFn: async () => {
      const result = await instance.acquireTokenSilent({
        scopes: [apiScope],
        account: activeAccount,
      })
      return getCampaign(result.accessToken, campaignId)
    },
  })
}

/** Replaces the Campaign's allowed Creation Methods (Keeper only) and stores the updated Campaign in the cache. */
export function useChangeAllowedCreationMethods(campaignId: string) {
  const { instance, accounts } = useMsal()
  const activeAccount = accounts[0]
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (allowedCreationMethods: CreationMethod[]) => {
      const result = await instance.acquireTokenSilent({
        scopes: [apiScope],
        account: activeAccount,
      })
      return changeAllowedCreationMethods(result.accessToken, campaignId, allowedCreationMethods)
    },
    onSuccess: (campaign) => queryClient.setQueryData(campaignQueryKeys.detail(campaignId), campaign),
  })
}
