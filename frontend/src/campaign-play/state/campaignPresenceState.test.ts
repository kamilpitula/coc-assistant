import { describe, expect, it } from 'vitest'

import {
  campaignPresenceReducer,
  displayedPresenceOf,
  initialCampaignPresenceState,
  type CampaignPresenceState,
} from './campaignPresenceState'

// specs/campaign-play/spec.md, Live connection contract; ux.md section 4 (states) and PR-UX-7, PR-UX-8.

function live(): CampaignPresenceState {
  const connected = campaignPresenceReducer(initialCampaignPresenceState, { type: 'connectionChanged', state: 'connected' })
  return campaignPresenceReducer(connected, {
    type: 'snapshotReceived',
    snapshot: { campaignId: 'c1', members: [{ memberId: 'keeper', presence: 'Connected' }] },
  })
}

describe('campaignPresenceReducer', () => {
  it('shows every member as Unknown before the first snapshot', () => {
    expect(initialCampaignPresenceState.connection).toBe('connecting')
    expect(displayedPresenceOf(initialCampaignPresenceState, 'keeper')).toBe('Unknown')
  })

  it('shows members in the snapshot as Connected and everyone else as Not connected', () => {
    const state = live()

    expect(displayedPresenceOf(state, 'keeper')).toBe('Connected')
    expect(displayedPresenceOf(state, 'player')).toBe('NotConnected')
  })

  it('updates one member when their Presence changes', () => {
    const state = campaignPresenceReducer(live(), {
      type: 'presenceChanged',
      change: { campaignId: 'c1', memberId: 'player', presence: 'Connected' },
    })

    expect(displayedPresenceOf(state, 'player')).toBe('Connected')
    expect(displayedPresenceOf(state, 'keeper')).toBe('Connected')
  })

  it('forgets every Presence when the own connection is lost, so every member is Unknown', () => {
    const state = campaignPresenceReducer(live(), { type: 'connectionChanged', state: 'reconnecting' })

    expect(state.connection).toBe('reconnecting')
    expect(displayedPresenceOf(state, 'keeper')).toBe('Unknown')
  })

  it('ignores a Presence change that arrives without a current snapshot', () => {
    const lost = campaignPresenceReducer(live(), { type: 'connectionChanged', state: 'reconnecting' })

    const state = campaignPresenceReducer(lost, {
      type: 'presenceChanged',
      change: { campaignId: 'c1', memberId: 'player', presence: 'Connected' },
    })

    expect(state.presenceByMember).toBeNull()
  })

  it('replaces the Presence states with the new snapshot after reconnecting', () => {
    const lost = campaignPresenceReducer(live(), { type: 'connectionChanged', state: 'reconnecting' })
    const reconnected = campaignPresenceReducer(lost, { type: 'connectionChanged', state: 'connected' })

    const state = campaignPresenceReducer(reconnected, {
      type: 'snapshotReceived',
      snapshot: { campaignId: 'c1', members: [{ memberId: 'player', presence: 'Connected' }] },
    })

    expect(displayedPresenceOf(state, 'player')).toBe('Connected')
    expect(displayedPresenceOf(state, 'keeper')).toBe('NotConnected')
  })

  it('records a refused subscription without any Presence', () => {
    const state = campaignPresenceReducer(initialCampaignPresenceState, { type: 'subscriptionRefused' })

    expect(state.connection).toBe('refused')
    expect(state.presenceByMember).toBeNull()
  })
})
