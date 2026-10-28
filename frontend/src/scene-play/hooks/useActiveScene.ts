import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import {
  activeSceneQueryKeys,
  changeInvestigatorsPresent,
  finishActiveScene,
  getActiveScene,
  startScene,
} from '@/scene-play/services/activeSceneApi'
import type { StartSceneInput } from '@/scene-play/types/ActiveScene'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** The Active Scene as the caller may see it; resolves to null when no Scene is Active. */
export function useActiveScene(campaignId: string, enabled = true) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: activeSceneQueryKeys.detail(campaignId),
    queryFn: async () => getActiveScene(await getAccessToken(), campaignId),
    enabled,
  })
}

// A transition changes the Active Scene, the Scenes' statuses, and the Wall.
function refetchAfterTransition(queryClient: QueryClient, campaignId: string): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: activeSceneQueryKeys.detail(campaignId) }),
    queryClient.invalidateQueries({ queryKey: sceneQueryKeys.inCampaign(campaignId) }),
    queryClient.invalidateQueries({ queryKey: campaignQueryKeys.wall(campaignId) }),
    queryClient.invalidateQueries({ queryKey: campaignQueryKeys.wallPreview(campaignId) }),
  ])
}

/** Starts a Scene with the chosen Investigators present, finishing the Active Scene first when asked. */
export function useStartScene(campaignId: string, sceneId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: StartSceneInput) => startScene(await getAccessToken(), campaignId, sceneId, input),
    onSuccess: (scene) => {
      queryClient.setQueryData(activeSceneQueryKeys.detail(campaignId), scene)
      return refetchAfterTransition(queryClient, campaignId)
    },
  })
}

/** Finishes the Active Scene. */
export function useFinishActiveScene(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => finishActiveScene(await getAccessToken(), campaignId),
    onSuccess: () => {
      queryClient.setQueryData(activeSceneQueryKeys.detail(campaignId), null)
      return refetchAfterTransition(queryClient, campaignId)
    },
  })
}

/** Replaces the Investigators present in the Active Scene. */
export function useChangeInvestigatorsPresent(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (presentInvestigatorIds: string[]) => changeInvestigatorsPresent(await getAccessToken(), campaignId, presentInvestigatorIds),
    onSuccess: (scene) => queryClient.setQueryData(activeSceneQueryKeys.detail(campaignId), scene),
  })
}
