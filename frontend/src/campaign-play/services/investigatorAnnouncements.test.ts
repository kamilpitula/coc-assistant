import { describe, expect, it } from 'vitest'

import type { CampaignMember, RosterInvestigator } from '@/campaign-play/types/CampaignMember'

import { describeInvestigatorChanges } from './investigatorAnnouncements'

// specs/campaign-overview/ux.md section 5.2 "Live Investigator details" (CO-UX-15 to CO-UX-18).

function player(memberId: string, displayName: string, investigator: RosterInvestigator | null, isYou = false): CampaignMember {
  return { memberId, displayName, role: 'Player', isYou, investigator }
}

const keeperRow: CampaignMember = { memberId: 'k', displayName: 'Eleanor Hart', role: 'Keeper', isYou: false, investigator: null }
const keeperYou: CampaignMember = { ...keeperRow, isYou: true }

const visible = (status: 'Draft' | 'Submitted' | 'ChangesRequested' | 'Approved', name: string | null): RosterInvestigator => ({
  visibility: 'Visible',
  name,
  status,
})

describe('describeInvestigatorChanges as the Keeper', () => {
  it('announces a first submission from In progress with the Investigator and Player names (CO-UX-15)', () => {
    const before = [keeperYou, player('a', 'Ana Ruiz', { visibility: 'InProgress' })]
    const after = [keeperYou, player('a', 'Ana Ruiz', visible('Submitted', 'Dr. Ames'))]

    expect(describeInvestigatorChanges(before, after)).toEqual(['Dr. Ames by Ana Ruiz was submitted.'])
  })

  it('announces a resubmission from Changes Requested', () => {
    const before = [keeperYou, player('a', 'Ana Ruiz', visible('ChangesRequested', 'Dr. Ames'))]
    const after = [keeperYou, player('a', 'Ana Ruiz', visible('Submitted', 'Dr. Ames'))]

    expect(describeInvestigatorChanges(before, after)).toEqual(['Dr. Ames by Ana Ruiz was submitted.'])
  })

  it('reads an unnamed Investigator as "Unnamed Investigator"', () => {
    const before = [keeperYou, player('a', 'Ana Ruiz', { visibility: 'InProgress' })]
    const after = [keeperYou, player('a', 'Ana Ruiz', visible('Submitted', null))]

    expect(describeInvestigatorChanges(before, after)).toEqual(['Unnamed Investigator by Ana Ruiz was submitted.'])
  })

  it('stays silent for the Keeper own Approve and Request changes, which the review page announces', () => {
    const submitted = [keeperYou, player('a', 'Ana Ruiz', visible('Submitted', 'Dr. Ames'))]

    expect(describeInvestigatorChanges(submitted, [keeperYou, player('a', 'Ana Ruiz', visible('Approved', 'Dr. Ames'))])).toEqual([])
    expect(describeInvestigatorChanges(submitted, [keeperYou, player('a', 'Ana Ruiz', visible('ChangesRequested', 'Dr. Ames'))])).toEqual([])
  })

  it('stays silent when a Draft is started or abandoned (CO-UX-18)', () => {
    const none = [keeperYou, player('a', 'Ana Ruiz', null)]
    const inProgress = [keeperYou, player('a', 'Ana Ruiz', { visibility: 'InProgress' })]

    expect(describeInvestigatorChanges(none, inProgress)).toEqual([])
    expect(describeInvestigatorChanges(inProgress, none)).toEqual([])
  })

  it('does not announce a Submitted row that was already Submitted', () => {
    const roster = [keeperYou, player('a', 'Ana Ruiz', visible('Submitted', 'Dr. Ames'))]

    expect(describeInvestigatorChanges(roster, [...roster])).toEqual([])
  })
})

describe('describeInvestigatorChanges as a Player', () => {
  it('announces another Player Investigator becoming Approved (CO-UX-17)', () => {
    const before = [keeperRow, player('y', 'Sam Okafor', null, true), player('a', 'Ana Ruiz', { visibility: 'NotReady' })]
    const after = [keeperRow, player('y', 'Sam Okafor', null, true), player('a', 'Ana Ruiz', visible('Approved', 'Dr. Ames'))]

    expect(describeInvestigatorChanges(before, after)).toEqual(['Dr. Ames is ready for play.'])
  })

  it('announces the own Investigator becoming Approved or Changes Requested (CO-UX-16)', () => {
    const submitted = [keeperRow, player('y', 'Sam Okafor', visible('Submitted', 'Mae Doyle'), true)]

    expect(describeInvestigatorChanges(submitted, [keeperRow, player('y', 'Sam Okafor', visible('Approved', 'Mae Doyle'), true)])).toEqual([
      'Your Investigator was approved.',
    ])
    expect(
      describeInvestigatorChanges(submitted, [keeperRow, player('y', 'Sam Okafor', visible('ChangesRequested', 'Mae Doyle'), true)]),
    ).toEqual(['Your Keeper asked for changes.'])
  })

  it('stays silent for the own Draft, own submission, and another Player still not ready', () => {
    const draft = [keeperRow, player('y', 'Sam Okafor', visible('Draft', null), true), player('a', 'Ana Ruiz', { visibility: 'NotReady' })]
    const submitted = [keeperRow, player('y', 'Sam Okafor', visible('Submitted', 'Mae Doyle'), true), player('a', 'Ana Ruiz', { visibility: 'NotReady' })]

    expect(describeInvestigatorChanges(draft, submitted)).toEqual([])
    expect(describeInvestigatorChanges([keeperRow, player('y', 'Sam Okafor', null, true)], draft)).toEqual([])
  })
})

describe('describeInvestigatorChanges in general', () => {
  it('announces nothing before the roster has been fetched', () => {
    expect(describeInvestigatorChanges(undefined, [keeperYou, player('a', 'Ana Ruiz', visible('Submitted', 'Dr. Ames'))])).toEqual([])
    expect(describeInvestigatorChanges([keeperYou], undefined)).toEqual([])
  })

  it('lists several changes found by one refetch in roster order', () => {
    const before = [keeperYou, player('b', 'Ben Cole', { visibility: 'InProgress' }), player('a', 'Ana Ruiz', { visibility: 'InProgress' })]
    const after = [keeperYou, player('b', 'Ben Cole', visible('Submitted', 'Mae Doyle')), player('a', 'Ana Ruiz', visible('Submitted', 'Dr. Ames'))]

    expect(describeInvestigatorChanges(before, after)).toEqual(['Mae Doyle by Ben Cole was submitted.', 'Dr. Ames by Ana Ruiz was submitted.'])
  })

  it('ignores a member who was not on the previous roster, since joining is announced as Presence', () => {
    const before = [keeperYou]
    const after = [keeperYou, player('a', 'Ana Ruiz', visible('Submitted', 'Dr. Ames'))]

    expect(describeInvestigatorChanges(before, after)).toEqual([])
  })
})
