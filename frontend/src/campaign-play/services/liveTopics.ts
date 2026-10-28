import type { QueryKey } from '@tanstack/react-query'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'

/**
 * The queries each CampaignDataChanged topic invalidates (specs/campaign-play/spec.md, Live connection contract;
 * ADR 0009). A new Campaign feature adds its topic here.
 * Invalidation matches by prefix, so investigators also refetches an open review and myInvestigator also refetches
 * the own Character Sheet. Both also refetch the roster, which shows each Investigator's status.
 */
const queryKeysByTopic: Record<string, (campaignId: string) => QueryKey[]> = {
  members: (campaignId) => [campaignQueryKeys.members(campaignId)],
  wallEntries: (campaignId) => [campaignQueryKeys.wall(campaignId), campaignQueryKeys.wallPreview(campaignId)],
  investigators: (campaignId) => [campaignQueryKeys.investigators(campaignId), campaignQueryKeys.members(campaignId)],
  myInvestigator: (campaignId) => [campaignQueryKeys.myInvestigator(campaignId), campaignQueryKeys.members(campaignId)],
  // The Keeper's Scene pages show the status change too (specs/scene-play/spec.md, Live updates).
  activeScene: (campaignId) => [activeSceneQueryKeys.detail(campaignId), sceneQueryKeys.inCampaign(campaignId)],
}

/** The query keys to refetch for the topics; unknown topics are ignored and each key appears once. */
export function queryKeysForTopics(campaignId: string, topics: readonly string[]): QueryKey[] {
  const keys = [...new Set(topics)].flatMap((topic) => queryKeysByTopic[topic]?.(campaignId) ?? [])
  return [...new Map(keys.map((key) => [JSON.stringify(key), key])).values()]
}
