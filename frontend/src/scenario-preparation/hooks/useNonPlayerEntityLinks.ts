import { useMutation, useQueryClient } from '@tanstack/react-query'

import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import {
  editNonPlayerEntityLink,
  linkNonPlayerEntity,
  unlinkNonPlayerEntity,
} from '@/scenario-preparation/services/nonPlayerEntityLinkApi'
import type { NewNonPlayerEntityLinkInput, NonPlayerEntityLinkInput } from '@/scenario-preparation/types/Scene'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** Every link write changes the Scene's response, so the confirmed write reloads the Scene. */
function useInvalidateScene(campaignId: string, scenarioId: string, sceneId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: sceneQueryKeys.detail(campaignId, scenarioId, sceneId) })
}

/** Links a Non-Player Entity to a Scene. */
export function useLinkNonPlayerEntity(campaignId: string, scenarioId: string, sceneId: string) {
  const getAccessToken = useAccessToken()
  const invalidateScene = useInvalidateScene(campaignId, scenarioId, sceneId)

  return useMutation({
    mutationFn: async (input: NewNonPlayerEntityLinkInput) =>
      linkNonPlayerEntity(await getAccessToken(), campaignId, scenarioId, sceneId, input),
    onSuccess: invalidateScene,
  })
}

/** Saves a link's Player-facing name and description. */
export function useEditNonPlayerEntityLink(campaignId: string, scenarioId: string, sceneId: string, linkId: string) {
  const getAccessToken = useAccessToken()
  const invalidateScene = useInvalidateScene(campaignId, scenarioId, sceneId)

  return useMutation({
    mutationFn: async (input: NonPlayerEntityLinkInput) =>
      editNonPlayerEntityLink(await getAccessToken(), campaignId, scenarioId, sceneId, linkId, input),
    onSuccess: invalidateScene,
  })
}

/** Unlinks a link; the profile itself stays. */
export function useUnlinkNonPlayerEntity(campaignId: string, scenarioId: string, sceneId: string, linkId: string) {
  const getAccessToken = useAccessToken()
  const invalidateScene = useInvalidateScene(campaignId, scenarioId, sceneId)

  return useMutation({
    mutationFn: async () => unlinkNonPlayerEntity(await getAccessToken(), campaignId, scenarioId, sceneId, linkId),
    onSuccess: invalidateScene,
  })
}
