import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import {
  getInvestigatorHeldItems,
  getMyHeldItems,
  giveItem,
  heldItemsQueryKeys,
  takeBackItem,
} from '@/scene-play/services/itemHolderApi'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** The calling Player's own held Items; resolves to null when the API answers 404 (no Approved Investigator). */
export function useMyHeldItems(campaignId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: heldItemsQueryKeys.mine(campaignId),
    queryFn: async () => getMyHeldItems(await getAccessToken(), campaignId),
    enabled,
  })
}

/** An Approved Investigator's held Items for the Keeper; resolves to null when the API answers 404. */
export function useInvestigatorHeldItems(campaignId: string, investigatorId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: heldItemsQueryKeys.investigator(campaignId, investigatorId),
    queryFn: async () => getInvestigatorHeldItems(await getAccessToken(), campaignId, investigatorId),
    enabled,
  })
}

/** What the Keeper submits in the give dialog: the Item and the Investigator who receives it. */
export interface GiveItemInput {
  itemId: string
  investigatorId: string
}

/**
 * A give or take-back changes who holds the Item everywhere it is named (Item panel, Scene, Clues), so the held
 * Items, the Active Scene, the Items, and the Scenes are refetched.
 */
export function invalidateItemHolderReads(queryClient: QueryClient, campaignId: string) {
  void queryClient.invalidateQueries({ queryKey: heldItemsQueryKeys.all(campaignId) })
  void queryClient.invalidateQueries({ queryKey: activeSceneQueryKeys.detail(campaignId) })
  void queryClient.invalidateQueries({ queryKey: itemQueryKeys.all(campaignId) })
  void queryClient.invalidateQueries({ queryKey: sceneQueryKeys.inCampaign(campaignId) })
}

/**
 * Gives an Item to an Investigator. The holder shows everywhere it is named (Item panel, Scene, Clues),
 * so the held Items, the Active Scene, the Items, and the Scenes are refetched.
 */
export function useGiveItem(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: GiveItemInput) => giveItem(await getAccessToken(), campaignId, input.itemId, input.investigatorId),
    onSuccess: () => invalidateItemHolderReads(queryClient, campaignId),
  })
}

/**
 * Takes an Item back to the Keeper. Like a give, it changes who holds the Item everywhere it is named,
 * so the held Items, the Active Scene, the Items, and the Scenes are refetched.
 */
export function useTakeBackItem(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (itemId: string) => takeBackItem(await getAccessToken(), campaignId, itemId),
    onSuccess: () => invalidateItemHolderReads(queryClient, campaignId),
  })
}
