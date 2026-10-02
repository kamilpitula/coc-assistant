import { useMsal } from '@azure/msal-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { campaignQueryKeys, createCampaign } from '@/campaign-play/services/campaignApi'
import type { CreateCampaignInput } from '@/campaign-play/types/Campaign'
import { apiScope } from '@/shared/services/msalConfig'

/** Creates a Campaign for the signed-in Keeper, acquiring an access token on demand. */
export function useCreateCampaign() {
  const { instance, accounts } = useMsal()
  const activeAccount = accounts[0]
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const result = await instance.acquireTokenSilent({
        scopes: [apiScope],
        account: activeAccount,
      })
      return createCampaign(result.accessToken, input)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campaignQueryKeys.all }),
  })
}
