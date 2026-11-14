import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { useAccessToken } from '@/shared/hooks/useAccessToken'
import {
  cancelRequestedRoll,
  getActiveSceneRollRequests,
  getMyRequestedRolls,
  getRollRequest,
  requestRoll,
  rollRequestQueryKeys,
  rollRequestedRoll,
} from '@/roll-requests/services/rollRequestApi'
import type { CreateRollRequestInput, RollRequest } from '@/roll-requests/types/RollRequest'

/** One Roll Request as the caller may see it; resolves to null when it is gone or not visible. */
export function useRollRequest(campaignId: string, rollRequestId: string, enabled = true) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: rollRequestQueryKeys.detail(campaignId, rollRequestId),
    queryFn: async () => getRollRequest(await getAccessToken(), campaignId, rollRequestId),
    enabled,
  })
}

/** The Active Scene's Roll Requests, oldest first; resolves to null for anyone but the Keeper. */
export function useActiveSceneRollRequests(campaignId: string, enabled = true) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: rollRequestQueryKeys.activeScene(campaignId),
    queryFn: async () => getActiveSceneRollRequests(await getAccessToken(), campaignId),
    enabled,
  })
}

/** The calling Player's Waiting Requested Rolls; resolves to null without an Approved Investigator. */
export function useMyRequestedRolls(campaignId: string, enabled = true) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: rollRequestQueryKeys.mine(campaignId),
    queryFn: async () => getMyRequestedRolls(await getAccessToken(), campaignId),
    enabled,
  })
}

/** Requests rolls of the Active Scene. The created card appears on the Wall, so the Wall and preview refetch too. */
export function useRequestRoll(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateRollRequestInput) => requestRoll(await getAccessToken(), campaignId, input),
    onSuccess: (created: RollRequest) => {
      queryClient.setQueryData(rollRequestQueryKeys.detail(campaignId, created.id), created)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: rollRequestQueryKeys.all(campaignId) }),
        queryClient.invalidateQueries({ queryKey: campaignQueryKeys.wall(campaignId) }),
        queryClient.invalidateQueries({ queryKey: campaignQueryKeys.wallPreview(campaignId) }),
      ])
    },
  })
}

/**
 * Rolls a Requested Roll with the server's dice. The card, the Waiting rolls, and the own rolls read the same
 * queries, so every list refetches at once; the Wall Entry itself is unchanged (specs/roll-requests/ux.md section 5).
 */
export function useRollRequestedRoll(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rollRequestId, investigatorId }: { rollRequestId: string; investigatorId: string }) =>
      rollRequestedRoll(await getAccessToken(), campaignId, rollRequestId, investigatorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rollRequestQueryKeys.all(campaignId) }),
  })
}

/**
 * Cancels a Waiting Requested Roll (specs/roll-requests/ux.md section 17.1). The card shows the Cancelled row, so the
 * same queries refetch as after a roll.
 */
export function useCancelRequestedRoll(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rollRequestId, investigatorId }: { rollRequestId: string; investigatorId: string }) =>
      cancelRequestedRoll(await getAccessToken(), campaignId, rollRequestId, investigatorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rollRequestQueryKeys.all(campaignId) }),
  })
}
