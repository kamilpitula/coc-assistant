import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createHumanNpc, deleteHumanNpc, editHumanNpc, getHumanNpc } from '@/scenario-preparation/services/humanNpcApi'
import { getNonPlayerEntities, nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import type { HumanNpcInput } from '@/scenario-preparation/types/HumanNpc'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** The Campaign's Non-Player Entity list. Only the Keeper's screens enable it. */
export function useNonPlayerEntities(campaignId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: nonPlayerEntityQueryKeys.list(campaignId),
    queryFn: async () => getNonPlayerEntities(await getAccessToken(), campaignId),
    enabled,
  })
}

/** One Human NPC; resolves to null when the API answers 404. Enabled only for the Keeper. */
export function useHumanNpc(campaignId: string, humanNpcId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: nonPlayerEntityQueryKeys.humanNpc(campaignId, humanNpcId),
    queryFn: async () => getHumanNpc(await getAccessToken(), campaignId, humanNpcId),
    enabled,
  })
}

/** Creates a Human NPC; the list and the Overview counts reload. */
export function useCreateHumanNpc(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: { name: string; age: number }) => createHumanNpc(await getAccessToken(), campaignId, values.name, values.age),
    onSuccess: (humanNpc) => {
      queryClient.setQueryData(nonPlayerEntityQueryKeys.humanNpc(campaignId, humanNpc.id), humanNpc)
      return queryClient.invalidateQueries({ queryKey: nonPlayerEntityQueryKeys.list(campaignId) })
    },
  })
}

/** Saves a Human NPC's whole profile; the confirmed profile replaces the cached one and the list reloads. */
export function useEditHumanNpc(campaignId: string, humanNpcId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: HumanNpcInput) => editHumanNpc(await getAccessToken(), campaignId, humanNpcId, input),
    onSuccess: (humanNpc) => {
      queryClient.setQueryData(nonPlayerEntityQueryKeys.humanNpc(campaignId, humanNpcId), humanNpc)
      return queryClient.invalidateQueries({ queryKey: nonPlayerEntityQueryKeys.list(campaignId) })
    },
  })
}

/** Deletes a Human NPC; its cache entry goes and the list reloads. */
export function useDeleteHumanNpc(campaignId: string, humanNpcId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => deleteHumanNpc(await getAccessToken(), campaignId, humanNpcId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: nonPlayerEntityQueryKeys.humanNpc(campaignId, humanNpcId) })
      return queryClient.invalidateQueries({ queryKey: nonPlayerEntityQueryKeys.list(campaignId) })
    },
  })
}
