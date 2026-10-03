import type { PresenceChanged, PresenceSnapshot } from '@/campaign-play/services/campaignHubMessages'
import type { DisplayedPresence, MemberPresence } from '@/campaign-play/types/CampaignMember'
import type { LiveConnectionState } from '@/shared/services/liveConnection'

/**
 * This client's view of a Campaign's Presence (specs/campaign-play/spec.md, Live connection contract; ux.md section 4).
 * `presenceByMember` is null while there is no current snapshot, which the roster shows as Unknown.
 */
export interface CampaignPresenceState {
  connection: LiveConnectionState | 'refused'
  presenceByMember: Readonly<Record<string, MemberPresence>> | null
}

export type CampaignPresenceAction =
  | { type: 'connectionChanged'; state: LiveConnectionState }
  | { type: 'snapshotReceived'; snapshot: PresenceSnapshot }
  | { type: 'presenceChanged'; change: PresenceChanged }
  | { type: 'subscriptionRefused' }

export const initialCampaignPresenceState: CampaignPresenceState = { connection: 'connecting', presenceByMember: null }

export function campaignPresenceReducer(state: CampaignPresenceState, action: CampaignPresenceAction): CampaignPresenceState {
  switch (action.type) {
    case 'connectionChanged':
      // Presence is only known while connected; the next snapshot replaces it.
      return {
        connection: action.state,
        presenceByMember: action.state === 'connected' ? state.presenceByMember : null,
      }
    case 'snapshotReceived':
      return {
        ...state,
        presenceByMember: Object.fromEntries(action.snapshot.members.map((member) => [member.memberId, member.presence])),
      }
    case 'presenceChanged':
      return state.presenceByMember === null
        ? state
        : { ...state, presenceByMember: { ...state.presenceByMember, [action.change.memberId]: action.change.presence } }
    case 'subscriptionRefused':
      return { connection: 'refused', presenceByMember: null }
  }
}

/** A member's Presence as the roster shows it; members missing from the snapshot are Not connected. */
export function displayedPresenceOf(state: CampaignPresenceState, memberId: string): DisplayedPresence {
  if (state.presenceByMember === null) {
    return 'Unknown'
  }

  return state.presenceByMember[memberId] ?? 'NotConnected'
}
