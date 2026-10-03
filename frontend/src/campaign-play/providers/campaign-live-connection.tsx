import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'

import { CampaignLiveConnectionContext } from '@/campaign-play/providers/campaignLiveConnectionContext'
import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import {
  parseCampaignDataChanged,
  parsePresenceChanged,
  parsePresenceSnapshot,
} from '@/campaign-play/services/campaignHubMessages'
import { queryKeysForTopics } from '@/campaign-play/services/liveTopics'
import { campaignPresenceReducer, initialCampaignPresenceState } from '@/campaign-play/state/campaignPresenceState'
import { useAccessToken } from '@/shared/hooks/useAccessToken'
import { createLiveConnection, type ConnectedReason, type LiveConnection } from '@/shared/services/liveConnection'

const CAMPAIGN_HUB_URL = '/hubs/campaign'

interface CampaignLiveConnectionProps {
  campaignId: string
  children: ReactNode
}

function isSameCampaign(first: string, second: string): boolean {
  return first.toLowerCase() === second.toLowerCase()
}

/**
 * Opens the Campaign's live connection for every page below the Campaign layout route and closes it when the user
 * leaves (specs/campaign-play/spec.md, Live connection contract). It subscribes after every (re)connect, keeps the
 * Presence states, refetches every Campaign query after a reconnect, and refetches the queries behind each topic.
 */
export function CampaignLiveConnection({ campaignId, children }: CampaignLiveConnectionProps) {
  const getAccessToken = useAccessToken()
  const accessTokenRef = useRef(getAccessToken)
  const connectionRef = useRef<LiveConnection | null>(null)
  const queryClient = useQueryClient()
  const [presence, dispatch] = useReducer(campaignPresenceReducer, initialCampaignPresenceState)

  useEffect(() => {
    accessTokenRef.current = getAccessToken
  }, [getAccessToken])

  useEffect(() => {
    const live = createLiveConnection({
      url: CAMPAIGN_HUB_URL,
      accessTokenFactory: () => accessTokenRef.current(),
      onStateChange: (state) => dispatch({ type: 'connectionChanged', state }),
      onConnected: (reason) => void subscribe(reason),
    })

    async function subscribe(reason: ConnectedReason) {
      const snapshot = await live
        .invoke('SubscribeToCampaign', campaignId)
        .then(parsePresenceSnapshot)
        .catch(() => null)
      if (snapshot === null) {
        dispatch({ type: 'subscriptionRefused' })
        return
      }

      dispatch({ type: 'snapshotReceived', snapshot })
      if (reason === 'reconnected') {
        void queryClient.invalidateQueries({ queryKey: campaignQueryKeys.detail(campaignId) })
      }
    }

    live.on('PresenceChanged', (payload: unknown) => {
      const change = parsePresenceChanged(payload)
      if (change !== null && isSameCampaign(change.campaignId, campaignId)) {
        dispatch({ type: 'presenceChanged', change })
      }
    })
    live.on('CampaignDataChanged', (payload: unknown) => {
      const change = parseCampaignDataChanged(payload)
      if (change === null || !isSameCampaign(change.campaignId, campaignId)) {
        return
      }
      queryKeysForTopics(campaignId, change.topics).forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }))
    })

    connectionRef.current = live
    void live.start()
    return () => {
      connectionRef.current = null
      void live.stop()
    }
  }, [campaignId, queryClient])

  const retry = useCallback(() => void connectionRef.current?.retry(), [])
  const value = useMemo(() => ({ connection: presence.connection, presence, retry }), [presence, retry])

  return <CampaignLiveConnectionContext.Provider value={value}>{children}</CampaignLiveConnectionContext.Provider>
}
