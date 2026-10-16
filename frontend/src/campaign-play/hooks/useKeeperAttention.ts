import { useCampaignMembers } from '@/campaign-play/hooks/useCampaignMembers'
import { keeperAttentionItems, type KeeperAttentionItem } from '@/campaign-play/services/attentionItems'
import { useScenarios } from '@/scenario-preparation/hooks/useScenarios'

interface KeeperAttention {
  isPending: boolean
  isError: boolean
  items: KeeperAttentionItem[]
  /** Reloads the roster and the Scenarios, which "Try again" covers together. */
  retry: () => void
}

/**
 * What needs the Keeper: the roster decides the review and invite items, the Scenario list decides whether the
 * Campaign still has none (specs/campaign-overview/ux.md section 4.1, specs/scenario-preparation/ux.md section 3).
 * Only the Keeper's attention list calls it, so a Player never asks for Scenarios.
 */
export function useKeeperAttention(campaignId: string): KeeperAttention {
  const members = useCampaignMembers(campaignId)
  const scenarios = useScenarios(campaignId, true)
  const items = members.data && scenarios.data ? keeperAttentionItems(members.data, scenarios.data.length) : []

  return {
    isPending: members.isPending || scenarios.isPending,
    isError: members.isError || scenarios.isError,
    items,
    retry: () => {
      void members.refetch()
      void scenarios.refetch()
    },
  }
}
