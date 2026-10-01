import { useMsal } from '@azure/msal-react'
import { useMutation } from '@tanstack/react-query'

import { joinCampaign } from '@/campaign-play/services/campaignApi'
import { apiScope } from '@/shared/services/msalConfig'

/** Admits the signed-in Account as a Player through a Campaign Invite token. */
export function useJoinCampaign() {
  const { instance, accounts } = useMsal()
  const activeAccount = accounts[0]

  return useMutation({
    mutationFn: async (token: string) => {
      const result = await instance.acquireTokenSilent({
        scopes: [apiScope],
        account: activeAccount,
      })
      return joinCampaign(result.accessToken, token)
    },
  })
}
