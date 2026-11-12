import type { QueryKey } from '@tanstack/react-query'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import { cluesQueryKeys } from '@/scene-play/services/cluesApi'
import { heldItemsQueryKeys } from '@/scene-play/services/itemHolderApi'
import { sceneHistoryQueryKeys } from '@/scene-play/services/sceneHistoryApi'
import { rollRequestQueryKeys } from '@/roll-requests/services/rollRequestApi'

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
  // A Reveal reaches only its recipients' accounts (myClues) and the Keeper (sceneReveals), never the Campaign (PBI-SPL-002 D6).
  myClues: (campaignId) => [activeSceneQueryKeys.detail(campaignId), cluesQueryKeys.mine(campaignId), sceneHistoryQueryKeys.detail(campaignId)],
  // A give or take-back changes who holds the Item everywhere it is named (PBI-SPL-003 D6): the Active Scene, the
  // Keeper Clues, the Scene queries, and the Items (all covers every Item detail by prefix) with every held-Items read.
  sceneReveals: (campaignId) => [
    activeSceneQueryKeys.detail(campaignId),
    cluesQueryKeys.investigators(campaignId),
    sceneQueryKeys.inCampaign(campaignId),
    itemQueryKeys.all(campaignId),
    heldItemsQueryKeys.all(campaignId),
    sceneHistoryQueryKeys.detail(campaignId),
  ],
  // A Scene starts or finishes, or the Investigators present change; the Scene History lists every played Scene (PBI-SPL-004).
  sceneHistory: (campaignId) => [sceneHistoryQueryKeys.detail(campaignId)],
  // An Item given to the caller's Investigator reaches only its holder (PBI-SPL-003 D6).
  myItems: (campaignId) => [heldItemsQueryKeys.mine(campaignId)],
  // A Roll Request change reaches every member watching the Active Scene, and the targeted Players' own lists
  // directly (PBI-DICE-005 D2, single-option live publication).
  rollRequests: (campaignId) => [rollRequestQueryKeys.all(campaignId)],
  myRequestedRolls: (campaignId) => [rollRequestQueryKeys.mine(campaignId)],
}

/** The query keys to refetch for the topics; unknown topics are ignored and each key appears once. */
export function queryKeysForTopics(campaignId: string, topics: readonly string[]): QueryKey[] {
  const keys = [...new Set(topics)].flatMap((topic) => queryKeysByTopic[topic]?.(campaignId) ?? [])
  return [...new Map(keys.map((key) => [JSON.stringify(key), key])).values()]
}
