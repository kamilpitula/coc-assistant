import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createHandout,
  deleteHandout,
  editHandout,
  getHandout,
  getHandoutFile,
  handoutQueryKeys,
  reorderHandouts,
  StaleHandoutOrderError,
} from '@/scenario-preparation/services/handoutApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { HandoutInput, HandoutSummary } from '@/scenario-preparation/types/Handout'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** One Handout with its content; resolves to null when the API answers 404. Enabled only for the Keeper. */
export function useHandout(campaignId: string, scenarioId: string, sceneId: string, handoutId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: handoutQueryKeys.detail(campaignId, scenarioId, sceneId, handoutId),
    queryFn: async () => getHandout(await getAccessToken(), campaignId, scenarioId, sceneId, handoutId),
    enabled,
  })
}

/** The stored file of an Image, Document, or Map Handout as a Blob; enabled only for the Keeper of a file Handout. */
export function useHandoutFile(campaignId: string, scenarioId: string, sceneId: string, handoutId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: handoutQueryKeys.file(campaignId, scenarioId, sceneId, handoutId),
    queryFn: async () => getHandoutFile(await getAccessToken(), campaignId, scenarioId, sceneId, handoutId),
    enabled,
  })
}

/** Every Handout write changes the Scene's response, so the confirmed write reloads the Scene. */
function useInvalidateScene(campaignId: string, scenarioId: string, sceneId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: sceneQueryKeys.detail(campaignId, scenarioId, sceneId) })
}

/** Adds a Handout to a Scene. */
export function useCreateHandout(campaignId: string, scenarioId: string, sceneId: string) {
  const getAccessToken = useAccessToken()
  const invalidateScene = useInvalidateScene(campaignId, scenarioId, sceneId)

  return useMutation({
    mutationFn: async (input: HandoutInput) => createHandout(await getAccessToken(), campaignId, scenarioId, sceneId, input),
    onSuccess: invalidateScene,
  })
}

/** Saves a Handout; the confirmed Handout replaces the cached one. */
export function useEditHandout(campaignId: string, scenarioId: string, sceneId: string, handoutId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()
  const invalidateScene = useInvalidateScene(campaignId, scenarioId, sceneId)

  return useMutation({
    mutationFn: async (input: HandoutInput) => editHandout(await getAccessToken(), campaignId, scenarioId, sceneId, handoutId, input),
    onSuccess: (handout) => {
      queryClient.setQueryData(handoutQueryKeys.detail(campaignId, scenarioId, sceneId, handoutId), handout)
      void queryClient.invalidateQueries({ queryKey: handoutQueryKeys.file(campaignId, scenarioId, sceneId, handoutId) })
      return invalidateScene()
    },
  })
}

/** Deletes a Handout of a Prepared Scene; its cache entry goes and the Scene reloads. */
export function useDeleteHandout(campaignId: string, scenarioId: string, sceneId: string, handoutId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()
  const invalidateScene = useInvalidateScene(campaignId, scenarioId, sceneId)

  return useMutation({
    mutationFn: async () => deleteHandout(await getAccessToken(), campaignId, scenarioId, sceneId, handoutId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: handoutQueryKeys.detail(campaignId, scenarioId, sceneId, handoutId) })
      return invalidateScene()
    },
  })
}

/**
 * Sends the complete new order. Updates are confirmed, not optimistic: the cached Scene's Handouts are replaced with the
 * server's answer, and a stale order (409) reloads the Scene instead.
 */
export function useReorderHandouts(campaignId: string, scenarioId: string, sceneId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()
  const sceneKey = sceneQueryKeys.detail(campaignId, scenarioId, sceneId)

  return useMutation({
    mutationFn: async (handoutIds: string[]) => reorderHandouts(await getAccessToken(), campaignId, scenarioId, sceneId, handoutIds),
    onSuccess: (handouts: HandoutSummary[]) =>
      queryClient.setQueryData<Scene | null | undefined>(sceneKey, (scene) => (scene ? { ...scene, handouts } : scene)),
    onError: (error) => (error instanceof StaleHandoutOrderError ? queryClient.invalidateQueries({ queryKey: sceneKey }) : undefined),
  })
}
