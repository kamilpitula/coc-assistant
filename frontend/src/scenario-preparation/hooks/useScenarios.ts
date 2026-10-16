import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createScenario,
  editScenario,
  getScenario,
  getScenarios,
  reorderScenarios,
  scenarioQueryKeys,
  StaleScenarioOrderError,
} from '@/scenario-preparation/services/scenarioApi'
import type { ScenarioInput } from '@/scenario-preparation/types/Scenario'
import { useAccessToken } from '@/shared/hooks/useAccessToken'

/**
 * The Campaign's Scenarios in order. Only the Keeper's screens enable it: a Player's client never asks
 * (specs/scenario-preparation/ux.md section 2).
 */
export function useScenarios(campaignId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: scenarioQueryKeys.list(campaignId),
    queryFn: async () => getScenarios(await getAccessToken(), campaignId),
    enabled,
  })
}

/** One Scenario; resolves to null when the API answers 404. Enabled only for the Keeper. */
export function useScenario(campaignId: string, scenarioId: string, enabled: boolean) {
  const getAccessToken = useAccessToken()

  return useQuery({
    queryKey: scenarioQueryKeys.detail(campaignId, scenarioId),
    queryFn: async () => getScenario(await getAccessToken(), campaignId, scenarioId),
    enabled,
  })
}

/** Creates a Scenario; the list reloads so the section and the attention item update. */
export function useCreateScenario(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ScenarioInput) => createScenario(await getAccessToken(), campaignId, input),
    onSuccess: (scenario) => {
      queryClient.setQueryData(scenarioQueryKeys.detail(campaignId, scenario.id), scenario)
      return queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.list(campaignId) })
    },
  })
}

/** Saves a Scenario's title and notes; the confirmed Scenario replaces the cached one. */
export function useEditScenario(campaignId: string, scenarioId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ScenarioInput) => editScenario(await getAccessToken(), campaignId, scenarioId, input),
    onSuccess: (scenario) => {
      queryClient.setQueryData(scenarioQueryKeys.detail(campaignId, scenarioId), scenario)
      return queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.list(campaignId) })
    },
  })
}

/**
 * Sends the complete new order. Updates are confirmed, not optimistic: the list cache is replaced with the server's
 * answer, and a stale order (409) reloads the list instead (specs/scenario-preparation/ux.md section 2.1).
 */
export function useReorderScenarios(campaignId: string) {
  const getAccessToken = useAccessToken()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (scenarioIds: string[]) => reorderScenarios(await getAccessToken(), campaignId, scenarioIds),
    onSuccess: (scenarios) => queryClient.setQueryData(scenarioQueryKeys.list(campaignId), scenarios),
    onError: (error) =>
      error instanceof StaleScenarioOrderError
        ? queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.list(campaignId) })
        : undefined,
  })
}
