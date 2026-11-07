import { useQuery } from '@tanstack/react-query'

import { getSceneHistory, sceneHistoryQueryKeys } from '@/scene-play/services/sceneHistoryApi'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** The Campaign's played Scenes as the caller may see them, newest started first. */
export function useSceneHistory(campaignId: string, enabled = true) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: sceneHistoryQueryKeys.detail(campaignId),
    queryFn: async () => getSceneHistory(await getAccessToken(), campaignId),
    enabled,
  })
}
