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
import { describeHandoutOwner, type HandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import type { HandoutInput, HandoutSummary } from '@/scenario-preparation/types/Handout'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** One Handout with its content; resolves to null when the API answers 404. Enabled only for the Keeper. */
export function useHandout(owner: HandoutOwner, handoutId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: handoutQueryKeys.detail(owner, handoutId),
    queryFn: async () => getHandout(await getAccessToken(), owner, handoutId),
    enabled,
  })
}

/** The stored file of an Image, Document, or Map Handout as a Blob; enabled only for the Keeper of a file Handout. */
export function useHandoutFile(owner: HandoutOwner, handoutId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: handoutQueryKeys.file(owner, handoutId),
    queryFn: async () => getHandoutFile(await getAccessToken(), owner, handoutId),
    enabled,
  })
}

/** Every Handout write changes the owner's response, so the confirmed write reloads the owner. */
function useInvalidateOwner(owner: HandoutOwner) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: describeHandoutOwner(owner).detailKey })
}

/** Adds a Handout to its owner. */
export function useCreateHandout(owner: HandoutOwner) {
  const getAccessToken = useAccessToken()
  const invalidateOwner = useInvalidateOwner(owner)

  return useMutation({
    mutationFn: async (input: HandoutInput) => createHandout(await getAccessToken(), owner, input),
    onSuccess: invalidateOwner,
  })
}

/** Saves a Handout; the confirmed Handout replaces the cached one. */
export function useEditHandout(owner: HandoutOwner, handoutId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()
  const invalidateOwner = useInvalidateOwner(owner)

  return useMutation({
    mutationFn: async (input: HandoutInput) => editHandout(await getAccessToken(), owner, handoutId, input),
    onSuccess: (handout) => {
      queryClient.setQueryData(handoutQueryKeys.detail(owner, handoutId), handout)
      void queryClient.invalidateQueries({ queryKey: handoutQueryKeys.file(owner, handoutId) })
      return invalidateOwner()
    },
  })
}

/** Deletes a Handout; its cache entry goes and the owner reloads. */
export function useDeleteHandout(owner: HandoutOwner, handoutId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()
  const invalidateOwner = useInvalidateOwner(owner)

  return useMutation({
    mutationFn: async () => deleteHandout(await getAccessToken(), owner, handoutId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: handoutQueryKeys.detail(owner, handoutId) })
      return invalidateOwner()
    },
  })
}

/**
 * Sends the complete new order. Updates are confirmed, not optimistic: the cached owner's Handouts are replaced with the
 * server's answer, and a stale order (409) reloads the owner instead.
 */
export function useReorderHandouts(owner: HandoutOwner) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()
  const ownerKey = describeHandoutOwner(owner).detailKey

  return useMutation({
    mutationFn: async (handoutIds: string[]) => reorderHandouts(await getAccessToken(), owner, handoutIds),
    onSuccess: (handouts: HandoutSummary[]) =>
      queryClient.setQueryData<{ handouts: HandoutSummary[] } | null | undefined>(ownerKey, (cached) => (cached ? { ...cached, handouts } : cached)),
    onError: (error) => (error instanceof StaleHandoutOrderError ? queryClient.invalidateQueries({ queryKey: ownerKey }) : undefined),
  })
}
