import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import {
  createInvestigator,
  deleteMyInvestigator,
  getMyCharacterSheet,
  getMyInvestigator,
  InvestigatorConflictError,
  saveMyCharacterSheet,
  submitMyInvestigator,
} from '@/campaign-play/services/investigatorApi'
import type { CharacterSheetInputs } from '@/campaign-play/types/CharacterSheet'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/** The Player's own Investigator summary; null when they have none. */
export function useMyInvestigator(campaignId: string, enabled = true) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: campaignQueryKeys.myInvestigator(campaignId),
    queryFn: async () => getMyInvestigator(await getAccessToken(), campaignId),
    enabled,
  })
}

/** The Player's Character Sheet with its computed values, rules, and problems; null when they have no Investigator. */
export function useMyCharacterSheet(campaignId: string, enabled = true) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: campaignQueryKeys.myCharacterSheet(campaignId),
    queryFn: async () => getMyCharacterSheet(await getAccessToken(), campaignId),
    enabled,
  })
}

/**
 * Creates the Player's Draft. When the API refuses (409), the Campaign's methods or the Player's Investigator changed
 * since the page loaded, so both are reloaded (specs/character-sheet/ux.md section 3.2).
 */
export function useCreateInvestigator(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => createInvestigator(await getAccessToken(), campaignId),
    onSuccess: (investigator) => {
      queryClient.setQueryData(campaignQueryKeys.myInvestigator(campaignId), investigator)
      return queryClient.invalidateQueries({ queryKey: campaignQueryKeys.myCharacterSheet(campaignId) })
    },
    onError: (error) => {
      if (error instanceof InvestigatorConflictError) {
        void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.detail(campaignId), exact: true })
        void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.myInvestigator(campaignId) })
      }
    },
  })
}

/** Saves the Character Sheet inputs and stores the recomputed sheet (specs/character-sheet/ux.md section 5.1). */
export function useSaveCharacterSheet(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inputs: CharacterSheetInputs) => saveMyCharacterSheet(await getAccessToken(), campaignId, inputs),
    onSuccess: (sheet) => {
      queryClient.setQueryData(campaignQueryKeys.myCharacterSheet(campaignId), sheet)
      return queryClient.invalidateQueries({ queryKey: campaignQueryKeys.myInvestigator(campaignId), exact: true })
    },
  })
}

/** Submits the Investigator to the Keeper; a 422 resolves with the remaining errors instead of throwing. */
export function useSubmitInvestigator(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => submitMyInvestigator(await getAccessToken(), campaignId),
    onSuccess: (result) => {
      if (result.kind === 'submitted') {
        queryClient.setQueryData(campaignQueryKeys.myInvestigator(campaignId), result.investigator)
        return queryClient.invalidateQueries({ queryKey: campaignQueryKeys.myCharacterSheet(campaignId) })
      }
    },
  })
}

/** "Start over": deletes the Draft and forgets the cached Investigator. */
export function useDeleteInvestigator(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => deleteMyInvestigator(await getAccessToken(), campaignId),
    onSuccess: () => {
      queryClient.setQueryData(campaignQueryKeys.myInvestigator(campaignId), null)
      queryClient.removeQueries({ queryKey: campaignQueryKeys.myCharacterSheet(campaignId) })
    },
  })
}
