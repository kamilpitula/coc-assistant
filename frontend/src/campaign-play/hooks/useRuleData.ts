import { useQuery } from '@tanstack/react-query'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { getOccupationCatalog, getSkillCatalog } from '@/campaign-play/services/ruleDataApi'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** The Occupation catalog of the Campaign's Era; rule data does not change while the app runs. */
export function useOccupationCatalog(campaignId: string) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: campaignQueryKeys.occupations(campaignId),
    queryFn: async () => getOccupationCatalog(await getAccessToken(), campaignId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}

/** The skills of the Campaign's Era; rule data does not change while the app runs. */
export function useSkillCatalog(campaignId: string) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: campaignQueryKeys.skills(campaignId),
    queryFn: async () => getSkillCatalog(await getAccessToken(), campaignId),
    staleTime: Number.POSITIVE_INFINITY,
  })
}
