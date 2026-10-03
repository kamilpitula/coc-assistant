import type { QueryKey } from '@tanstack/react-query'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'

/**
 * The queries each CampaignDataChanged topic invalidates (specs/campaign-play/spec.md, Live connection contract;
 * ADR 0009). A new Campaign feature adds its topic here; PBI-CP-006 adds wallEntries, investigators, myInvestigator.
 */
const queryKeysByTopic: Record<string, (campaignId: string) => QueryKey[]> = {
  members: (campaignId) => [campaignQueryKeys.members(campaignId)],
}

/** The query keys to refetch for the topics; unknown topics are ignored and each key appears once. */
export function queryKeysForTopics(campaignId: string, topics: readonly string[]): QueryKey[] {
  const uniqueTopics = [...new Set(topics)]
  return uniqueTopics.flatMap((topic) => queryKeysByTopic[topic]?.(campaignId) ?? [])
}
