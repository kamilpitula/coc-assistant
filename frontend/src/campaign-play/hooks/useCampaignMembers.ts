import { useQuery } from '@tanstack/react-query'

import { campaignQueryKeys, getCampaignMembers } from '@/campaign-play/services/campaignApi'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** Loads the Campaign's roster in display order; resolves to null for anyone who is not a Campaign Member. */
export function useCampaignMembers(campaignId: string) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: campaignQueryKeys.members(campaignId),
    queryFn: async () => getCampaignMembers(await getAccessToken(), campaignId),
  })
}
