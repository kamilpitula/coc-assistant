import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createHumanNpc, deleteHumanNpc, editHumanNpc, getHumanNpc } from '@/scenario-preparation/services/humanNpcApi'
import { createMythosCreature, deleteMythosCreature, editMythosCreature, getMythosCreature } from '@/scenario-preparation/services/mythosCreatureApi'
import { getNonPlayerEntities, nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import type { HumanNpcInput } from '@/scenario-preparation/types/HumanNpc'
import type { MythosCreatureInput } from '@/scenario-preparation/types/MythosCreature'
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

/** One Mythos Creature; resolves to null when the API answers 404. Enabled only for the Keeper. */
export function useMythosCreature(campaignId: string, mythosCreatureId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: nonPlayerEntityQueryKeys.mythosCreature(campaignId, mythosCreatureId),
    queryFn: async () => getMythosCreature(await getAccessToken(), campaignId, mythosCreatureId),
    enabled,
  })
}

/** Creates a Mythos Creature from its name; the list and the Overview counts reload. */
export function useCreateMythosCreature(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: { name: string }) => createMythosCreature(await getAccessToken(), campaignId, values.name),
    onSuccess: (mythosCreature) => {
      queryClient.setQueryData(nonPlayerEntityQueryKeys.mythosCreature(campaignId, mythosCreature.id), mythosCreature)
      return queryClient.invalidateQueries({ queryKey: nonPlayerEntityQueryKeys.list(campaignId) })
    },
  })
}

/** Saves a Mythos Creature's whole profile; the confirmed profile replaces the cached one and the list reloads. */
export function useEditMythosCreature(campaignId: string, mythosCreatureId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: MythosCreatureInput) => editMythosCreature(await getAccessToken(), campaignId, mythosCreatureId, input),
    onSuccess: (mythosCreature) => {
      queryClient.setQueryData(nonPlayerEntityQueryKeys.mythosCreature(campaignId, mythosCreatureId), mythosCreature)
      return queryClient.invalidateQueries({ queryKey: nonPlayerEntityQueryKeys.list(campaignId) })
    },
  })
}

/** Deletes a Mythos Creature; its cache entry goes and the list reloads. */
export function useDeleteMythosCreature(campaignId: string, mythosCreatureId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => deleteMythosCreature(await getAccessToken(), campaignId, mythosCreatureId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: nonPlayerEntityQueryKeys.mythosCreature(campaignId, mythosCreatureId) })
      return queryClient.invalidateQueries({ queryKey: nonPlayerEntityQueryKeys.list(campaignId) })
    },
  })
}
