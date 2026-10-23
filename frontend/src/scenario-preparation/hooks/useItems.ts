import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createItem, deleteItem, editItem, getItem, getItems, itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { ItemInput } from '@/scenario-preparation/types/Item'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** The Campaign's Items with their Scene counts. Only the Keeper's screens enable it. */
export function useItems(campaignId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: itemQueryKeys.list(campaignId),
    queryFn: async () => getItems(await getAccessToken(), campaignId),
    enabled,
  })
}

/** One Item; resolves to null when the API answers 404. Enabled only for the Keeper. */
export function useItem(campaignId: string, itemId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: itemQueryKeys.detail(campaignId, itemId),
    queryFn: async () => getItem(await getAccessToken(), campaignId, itemId),
    enabled,
  })
}

/** Creates an Item; the list and the Overview count reload. */
export function useCreateItem(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ItemInput) => createItem(await getAccessToken(), campaignId, input),
    onSuccess: (item) => {
      queryClient.setQueryData(itemQueryKeys.detail(campaignId, item.id), item)
      return queryClient.invalidateQueries({ queryKey: itemQueryKeys.list(campaignId) })
    },
  })
}

/**
 * Saves an Item; the confirmed Item replaces the cached one, and the list and every Scene that links it reload, because the
 * Scene page shows the live name.
 */
export function useEditItem(campaignId: string, itemId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ItemInput) => editItem(await getAccessToken(), campaignId, itemId, input),
    onSuccess: (item) => {
      queryClient.setQueryData(itemQueryKeys.detail(campaignId, itemId), item)
      for (const scene of item.scenes) {
        void queryClient.invalidateQueries({ queryKey: sceneQueryKeys.detail(campaignId, scene.scenarioId, scene.id) })
      }
      return queryClient.invalidateQueries({ queryKey: itemQueryKeys.list(campaignId) })
    },
  })
}

/** Deletes an Item; its cache entry goes, and the list and the Scene pages, which lose the link, reload. */
export function useDeleteItem(campaignId: string, itemId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => deleteItem(await getAccessToken(), campaignId, itemId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: itemQueryKeys.detail(campaignId, itemId) })
      void queryClient.invalidateQueries({ queryKey: sceneQueryKeys.inCampaign(campaignId) })
      return queryClient.invalidateQueries({ queryKey: itemQueryKeys.list(campaignId) })
    },
  })
}
