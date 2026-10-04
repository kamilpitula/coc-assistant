import { useQuery } from '@tanstack/react-query'

import { campaignListQueryKeys, getCampaignList } from '@/campaign-list/services/campaignListApi'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/**
 * Loads the caller's Campaign List. It refetches whenever the window regains focus, the only freshness the list has
 * until live updates arrive (specs/campaign-list/spec.md, Freshness).
 */
export function useCampaignList() {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: campaignListQueryKeys.list,
    queryFn: async () => getCampaignList(await getAccessToken()),
    refetchOnWindowFocus: true,
  })
}
