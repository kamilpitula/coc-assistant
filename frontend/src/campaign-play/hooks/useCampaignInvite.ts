import { useMsal } from '@azure/msal-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  campaignQueryKeys,
  getActiveInvite,
  issueInvite,
  replaceInvite,
  revokeInvite,
} from '@/campaign-play/services/campaignApi'
import { apiScope } from '@/shared/services/msalConfig'

/** Loads the Keeper's active Campaign Invite, acquiring an access token on demand. */
export function useCampaignInvite(campaignId: string) {
  const { instance, accounts } = useMsal()
  const activeAccount = accounts[0]

  return useQuery({
    queryKey: campaignQueryKeys.invite(campaignId),
    queryFn: async () => {
      const result = await instance.acquireTokenSilent({
        scopes: [apiScope],
        account: activeAccount,
      })
      return getActiveInvite(result.accessToken, campaignId)
    },
  })
}

/** Issues (or returns the existing) active Campaign Invite for the Keeper. */
export function useIssueInvite(campaignId: string) {
  const { instance, accounts } = useMsal()
  const activeAccount = accounts[0]
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await instance.acquireTokenSilent({
        scopes: [apiScope],
        account: activeAccount,
      })
      return issueInvite(result.accessToken, campaignId)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.invite(campaignId) }),
  })
}

/** Replaces the active Campaign Invite with one bearing a fresh token. */
export function useReplaceInvite(campaignId: string) {
  const { instance, accounts } = useMsal()
  const activeAccount = accounts[0]
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await instance.acquireTokenSilent({
        scopes: [apiScope],
        account: activeAccount,
      })
      return replaceInvite(result.accessToken, campaignId)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.invite(campaignId) }),
  })
}

/** Revokes the Keeper's active Campaign Invite so it can no longer admit Players. */
export function useRevokeInvite(campaignId: string) {
  const { instance, accounts } = useMsal()
  const activeAccount = accounts[0]
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await instance.acquireTokenSilent({
        scopes: [apiScope],
        account: activeAccount,
      })
      return revokeInvite(result.accessToken, campaignId)
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.invite(campaignId) }),
  })
}
