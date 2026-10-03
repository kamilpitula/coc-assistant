import { describe, expect, it } from 'vitest'

import type { CampaignMember, RosterInvestigator } from '@/campaign-play/types/CampaignMember'

import { investigatorCellsFor } from './rosterRows'

// specs/campaign-overview/ux.md section 5.1: Investigator cell, Status cell, and Action by viewer.
function player(investigator: RosterInvestigator | null, isYou = false): CampaignMember {
  return { memberId: 'p1', displayName: 'Ana Ruiz', role: 'Player', isYou, investigator }
}

const keeper: CampaignMember = { memberId: 'c1', displayName: 'Eleanor Hart', role: 'Keeper', isYou: false, investigator: null }

describe('investigatorCellsFor', () => {
  it.each(['Keeper', 'Player'] as const)("shows nothing for the Keeper's row to a %s", (viewer) => {
    expect(investigatorCellsFor(keeper, viewer)).toEqual({ investigator: null, status: null, action: null })
  })

  it.each(['Keeper', 'Player'] as const)('shows "No Investigator yet" for a Player without one to a %s', (viewer) => {
    expect(investigatorCellsFor(player(null), viewer)).toEqual({
      investigator: { text: 'No Investigator yet', muted: true },
      status: null,
      action: null,
    })
  })

  it('hides a Draft name from the Keeper and shows it as in progress', () => {
    expect(investigatorCellsFor(player({ visibility: 'InProgress' }), 'Keeper')).toEqual({
      investigator: { text: 'Not shown until submitted', muted: true },
      status: { status: 'Draft', audience: 'Keeper' },
      action: null,
    })
  })

  it('offers the Keeper "Review" for a Submitted Investigator', () => {
    const member = player({ visibility: 'Visible', id: 'i1', name: 'Dr. Ames', status: 'Submitted' })

    expect(investigatorCellsFor(member, 'Keeper')).toEqual({
      investigator: { text: 'Dr. Ames', muted: false },
      status: { status: 'Submitted', audience: 'Keeper' },
      action: { label: 'Review', to: 'review', investigatorId: 'i1', investigatorName: 'Dr. Ames' },
    })
  })

  it.each(['ChangesRequested', 'Approved'] as const)('offers the Keeper "View" for a %s Investigator', (status) => {
    const member = player({ visibility: 'Visible', id: 'i1', name: 'Dr. Ames', status })

    expect(investigatorCellsFor(member, 'Keeper')).toEqual({
      investigator: { text: 'Dr. Ames', muted: false },
      status: { status, audience: 'Keeper' },
      action: { label: 'View', to: 'review', investigatorId: 'i1', investigatorName: 'Dr. Ames' },
    })
  })

  it('offers a Player "Continue" on their own unnamed Draft', () => {
    const member = player({ visibility: 'Visible', name: null, status: 'Draft' }, true)

    expect(investigatorCellsFor(member, 'Player')).toEqual({
      investigator: { text: 'Unnamed Investigator', muted: false },
      status: { status: 'Draft', audience: 'Player' },
      action: { label: 'Continue', to: 'mine', investigatorName: 'Unnamed Investigator' },
    })
  })

  it.each(['Submitted', 'Approved'] as const)('offers a Player "View" on their own %s Investigator', (status) => {
    const member = player({ visibility: 'Visible', name: 'Mae Doyle', status }, true)

    expect(investigatorCellsFor(member, 'Player')).toEqual({
      investigator: { text: 'Mae Doyle', muted: false },
      status: { status, audience: 'Player' },
      action: { label: 'View', to: 'mine', investigatorName: 'Mae Doyle' },
    })
  })

  it('offers a Player "Edit Investigator" when the Keeper asked for changes', () => {
    const member = player({ visibility: 'Visible', name: 'Mae Doyle', status: 'ChangesRequested' }, true)

    expect(investigatorCellsFor(member, 'Player')).toEqual({
      investigator: { text: 'Mae Doyle', muted: false },
      status: { status: 'ChangesRequested', audience: 'Player' },
      action: { label: 'Edit Investigator', to: 'mineSheet', investigatorName: 'Mae Doyle' },
    })
  })

  // Decision D3: another Player's Approved Investigator reads "Approved", the third-person (Keeper) label.
  it("shows a Player another Player's Approved Investigator by name, labelled Approved, with no action", () => {
    const member = player({ visibility: 'Visible', name: 'Mae Doyle', status: 'Approved' })

    expect(investigatorCellsFor(member, 'Player')).toEqual({
      investigator: { text: 'Mae Doyle', muted: false },
      status: { status: 'Approved', audience: 'Keeper' },
      action: null,
    })
  })

  it('shows a Player "Not ready yet" for another Player\'s Investigator that is not Approved', () => {
    expect(investigatorCellsFor(player({ visibility: 'NotReady' }), 'Player')).toEqual({
      investigator: { text: 'Not ready yet', muted: true },
      status: null,
      action: null,
    })
  })
})
