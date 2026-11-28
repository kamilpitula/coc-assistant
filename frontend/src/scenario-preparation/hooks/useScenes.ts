import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createScene,
  editScene,
  getScene,
  getScenes,
  removeScene,
  reorderScenes,
  saveKeeperNotes,
  sceneQueryKeys,
  StaleSceneOrderError,
} from '@/scenario-preparation/services/sceneApi'
import type { Scene, SceneEditInput, SceneInput } from '@/scenario-preparation/types/Scene'
import type { RichTextDocument } from '@/shared/types/RichText'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** The Scenario's Scenes in prepared order. Only the Keeper's screens enable it. */
export function useScenes(campaignId: string, scenarioId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: sceneQueryKeys.list(campaignId, scenarioId),
    queryFn: async () => getScenes(await getAccessToken(), campaignId, scenarioId),
    enabled,
  })
}

/** One Scene; resolves to null when the API answers 404. Enabled only for the Keeper. */
export function useScene(campaignId: string, scenarioId: string, sceneId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: sceneQueryKeys.detail(campaignId, scenarioId, sceneId),
    queryFn: async () => getScene(await getAccessToken(), campaignId, scenarioId, sceneId),
    enabled,
  })
}

/** Creates a Scene; the list reloads so the Scenario page shows it last. */
export function useCreateScene(campaignId: string, scenarioId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SceneInput) => createScene(await getAccessToken(), campaignId, scenarioId, input),
    onSuccess: (scene) => {
      queryClient.setQueryData(sceneQueryKeys.detail(campaignId, scenarioId, scene.id), scene)
      return queryClient.invalidateQueries({ queryKey: sceneQueryKeys.list(campaignId, scenarioId) })
    },
  })
}

/** Saves a Scene's title and location; the confirmed Scene replaces the cached one. Keeper notes keep their own save. */
export function useEditScene(campaignId: string, scenarioId: string, sceneId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SceneEditInput) => editScene(await getAccessToken(), campaignId, scenarioId, sceneId, input),
    onSuccess: (scene) => {
      queryClient.setQueryData(sceneQueryKeys.detail(campaignId, scenarioId, sceneId), scene)
      return queryClient.invalidateQueries({ queryKey: sceneQueryKeys.list(campaignId, scenarioId) })
    },
  })
}

/**
 * Saves the Keeper notes with the version they were based on; never retried, so a 400, 404, or 409 surfaces at once.
 * A confirmed save merges the notes and their new version into the cached Scene; the list carries no notes.
 */
export function useSaveKeeperNotes(campaignId: string, scenarioId: string, sceneId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ keeperNotes, notesVersion }: { keeperNotes: RichTextDocument | null; notesVersion: number }) =>
      saveKeeperNotes(await getAccessToken(), campaignId, scenarioId, sceneId, keeperNotes, notesVersion),
    retry: false,
    onSuccess: (saved) => {
      queryClient.setQueryData<Scene>(sceneQueryKeys.detail(campaignId, scenarioId, sceneId), (cached) =>
        cached === undefined ? cached : { ...cached, keeperNotes: saved.keeperNotes, notesVersion: saved.notesVersion },
      )
    },
  })
}

/** Removes a Prepared Scene; the list reloads and the removed Scene's cache entry goes. */
export function useRemoveScene(campaignId: string, scenarioId: string, sceneId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => removeScene(await getAccessToken(), campaignId, scenarioId, sceneId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: sceneQueryKeys.detail(campaignId, scenarioId, sceneId) })
      return queryClient.invalidateQueries({ queryKey: sceneQueryKeys.list(campaignId, scenarioId) })
    },
  })
}

/**
 * Sends the complete new order. Updates are confirmed, not optimistic: the list cache is replaced with the server's
 * answer, and a stale order (409) reloads the list instead.
 */
export function useReorderScenes(campaignId: string, scenarioId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sceneIds: string[]) => reorderScenes(await getAccessToken(), campaignId, scenarioId, sceneIds),
    onSuccess: (scenes) => queryClient.setQueryData(sceneQueryKeys.list(campaignId, scenarioId), scenes),
    onError: (error) =>
      error instanceof StaleSceneOrderError
        ? queryClient.invalidateQueries({ queryKey: sceneQueryKeys.list(campaignId, scenarioId) })
        : undefined,
  })
}
