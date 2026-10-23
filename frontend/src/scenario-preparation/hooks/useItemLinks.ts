import { useMutation, useQueryClient } from '@tanstack/react-query'

import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import { linkItem, unlinkItem } from '@/scenario-preparation/services/itemLinkApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/**
 * Every link write changes the Scene's response, the Item's Scenes, and the Items list's Scene counts, so the confirmed write
 * reloads all three (specs/scenario-preparation/ux.md sections 64.2 and 64.3).
 */
function useInvalidateAfterLinkChange(campaignId: string, scenarioId: string, sceneId: string) {
  const queryClient = useQueryClient()

  return (itemId: string) => {
    void queryClient.invalidateQueries({ queryKey: itemQueryKeys.detail(campaignId, itemId) })
    void queryClient.invalidateQueries({ queryKey: itemQueryKeys.list(campaignId) })
    return queryClient.invalidateQueries({ queryKey: sceneQueryKeys.detail(campaignId, scenarioId, sceneId) })
  }
}

/** Links an Item of the Campaign to a Scene. */
export function useLinkItem(campaignId: string, scenarioId: string, sceneId: string) {
  const getAccessToken = useAccessToken()
  const invalidate = useInvalidateAfterLinkChange(campaignId, scenarioId, sceneId)

  return useMutation({
    mutationFn: async (itemId: string) => linkItem(await getAccessToken(), campaignId, scenarioId, sceneId, itemId),
    onSuccess: (link) => invalidate(link.item.id),
  })
}

/** Unlinks an Item from a Scene; the Item itself stays. */
export function useUnlinkItem(campaignId: string, scenarioId: string, sceneId: string, link: { id: string; itemId: string }) {
  const getAccessToken = useAccessToken()
  const invalidate = useInvalidateAfterLinkChange(campaignId, scenarioId, sceneId)

  return useMutation({
    mutationFn: async () => unlinkItem(await getAccessToken(), campaignId, scenarioId, sceneId, link.id),
    onSuccess: () => invalidate(link.itemId),
  })
}
