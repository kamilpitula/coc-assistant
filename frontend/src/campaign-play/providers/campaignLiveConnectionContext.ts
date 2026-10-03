import { createContext, useContext } from 'react'

import type { CampaignPresenceState } from '@/campaign-play/state/campaignPresenceState'

/** The Campaign's live connection as shared with the Campaign pages (ux.md section 8, Connection). */
export interface CampaignLiveConnectionValue {
  connection: CampaignPresenceState['connection']
  presence: CampaignPresenceState
  /** Starts a new connection attempt after reconnecting failed ("Try again"). */
  retry: () => void
}

export const CampaignLiveConnectionContext = createContext<CampaignLiveConnectionValue | null>(null)

/** The live connection of the Campaign layout route; only usable below the CampaignLiveConnection provider. */
export function useCampaignLiveConnection(): CampaignLiveConnectionValue {
  const value = useContext(CampaignLiveConnectionContext)
  if (value === null) {
    throw new Error('useCampaignLiveConnection must be used inside CampaignLiveConnection.')
  }
  return value
}
