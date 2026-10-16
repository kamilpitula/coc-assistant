import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { addWallEntry, getWallEntries, removeWallEntry } from '@/campaign-play/services/wallEntryApi'
import { rememberOwnWallEntry } from '@/campaign-play/services/ownWallEntries'
import { prependWallEntry, withoutWallEntry } from '@/campaign-play/services/wallEntryCache'
import type { NewWallEntry } from '@/campaign-play/types/WallEntry'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** How many entries the overview preview shows (specs/campaign-wall/ux.md section 7). */
export const WALL_PREVIEW_SIZE = 5

/** The Wall page's entries, newest first, loaded a page at a time. */
export function useWallEntries(campaignId: string) {
  const getAccessToken = useAccessToken()

  return useInfiniteQuery({
    queryKey: campaignQueryKeys.wall(campaignId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => getWallEntries(await getAccessToken(), campaignId, { cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

/** The latest entries for the overview, read-only. */
export function useWallPreview(campaignId: string) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: campaignQueryKeys.wallPreview(campaignId),
    queryFn: async () => getWallEntries(await getAccessToken(), campaignId, { limit: WALL_PREVIEW_SIZE }),
  })
}

/** Adds an entry; the confirmed entry goes to the top of the Wall, and the preview reloads next time it is shown. */
export function useAddWallEntry(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entry: NewWallEntry) => addWallEntry(await getAccessToken(), campaignId, entry),
    onSuccess: (entry) => {
      rememberOwnWallEntry(entry.id)
      queryClient.setQueryData(campaignQueryKeys.wall(campaignId), (cache: Parameters<typeof prependWallEntry>[0]) =>
        prependWallEntry(cache, entry),
      )
      return queryClient.invalidateQueries({ queryKey: campaignQueryKeys.wallPreview(campaignId) })
    },
  })
}

/** Removes an entry (Keeper only). */
export function useRemoveWallEntry(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entryId: string) => removeWallEntry(await getAccessToken(), campaignId, entryId),
    onSuccess: (_result, entryId) => {
      queryClient.setQueryData(campaignQueryKeys.wall(campaignId), (cache: Parameters<typeof withoutWallEntry>[0]) =>
        withoutWallEntry(cache, entryId),
      )
      return queryClient.invalidateQueries({ queryKey: campaignQueryKeys.wallPreview(campaignId) })
    },
  })
}
