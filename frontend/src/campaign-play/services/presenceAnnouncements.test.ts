import { describe, expect, it } from 'vitest'

import type { CampaignMember } from '@/campaign-play/types/CampaignMember'

import { describePresenceChanges, type PresenceView } from './presenceAnnouncements'

// specs/campaign-play/ux.md section 6 (screen-reader announcements) and PR-A11Y-4.

const keeper: CampaignMember = { memberId: 'k', displayName: 'Eleanor Hart', role: 'Keeper', isYou: false, investigator: null }
const you: CampaignMember = { memberId: 'y', displayName: 'Sam Okafor', role: 'Player', isYou: true, investigator: null }
const alex: CampaignMember = { memberId: 'a', displayName: 'Alex Brandt', role: 'Player', isYou: false, investigator: null }
const priya: CampaignMember = { memberId: 'p', displayName: 'Priya Nair', role: 'Player', isYou: false, investigator: null }

function view(members: CampaignMember[] | undefined, presenceByMember: PresenceView['presenceByMember']): PresenceView {
  return { members, presenceByMember }
}

const roster = [keeper, you, alex]

describe('describePresenceChanges', () => {
  it('does not announce the first snapshot after loading', () => {
    expect(
      describePresenceChanges(view(roster, null), view(roster, { k: 'Connected', y: 'Connected' }), { hadSnapshotBefore: false }),
    ).toEqual([])
  })

  it('announces a member who connects and one who disconnects', () => {
    const before = view(roster, { k: 'Connected', y: 'Connected' })

    expect(describePresenceChanges(before, view(roster, { k: 'Connected', y: 'Connected', a: 'Connected' }), { hadSnapshotBefore: true })).toEqual(['Alex Brandt connected.'])
    expect(describePresenceChanges(before, view(roster, { k: 'NotConnected', y: 'Connected' }), { hadSnapshotBefore: true })).toEqual(['Eleanor Hart disconnected.'])
  })

  it('never announces your own connection as a member event', () => {
    expect(
      describePresenceChanges(view(roster, { y: 'Connected' }), view(roster, { y: 'NotConnected' }), { hadSnapshotBefore: true }),
    ).toEqual([])
  })

  it('announces a Player who joins the Campaign instead of their connection', () => {
    const before = view(roster, { k: 'Connected', y: 'Connected' })
    const after = view([...roster, priya], { k: 'Connected', y: 'Connected', p: 'Connected' })

    expect(describePresenceChanges(before, after, { hadSnapshotBefore: true })).toEqual(['Priya Nair joined the Campaign.'])
  })

  it('does not announce the roster as it first loads', () => {
    expect(describePresenceChanges(view(undefined, null), view(roster, null), { hadSnapshotBefore: false })).toEqual([])
  })

  it('announces that your connection is restored', () => {
    expect(
      describePresenceChanges(view(roster, null), view(roster, { k: 'Connected', y: 'Connected' }), { hadSnapshotBefore: true }),
    ).toEqual(['Reconnected.'])
  })

  it('announces several changes together', () => {
    const before = view(roster, { k: 'Connected', y: 'Connected' })
    const after = view(roster, { k: 'NotConnected', y: 'Connected', a: 'Connected' })

    expect(describePresenceChanges(before, after, { hadSnapshotBefore: true })).toEqual([
      'Eleanor Hart disconnected.',
      'Alex Brandt connected.',
    ])
  })

  it('announces nothing when nothing changed', () => {
    const same = view(roster, { k: 'Connected' })

    expect(describePresenceChanges(same, same, { hadSnapshotBefore: true })).toEqual([])
  })
})
