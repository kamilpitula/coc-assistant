import { describe, expect, it } from 'vitest'

import type { PlayerCampaign } from '@/campaign-play/types/Campaign'
import type { CampaignMember, RosterInvestigator } from '@/campaign-play/types/CampaignMember'
import type { InvestigatorStatus, InvestigatorSummary } from '@/campaign-play/types/Investigator'

import { keeperAttentionItems, playerAttentionItem } from './attentionItems'

// specs/campaign-overview/spec.md, Attention items; ux.md sections 4.1 and 4.2.
const keeper: CampaignMember = { memberId: 'c1', displayName: 'Eleanor Hart', role: 'Keeper', isYou: true, investigator: null }

function player(memberId: string, displayName: string, investigator: RosterInvestigator | null): CampaignMember {
  return { memberId, displayName, role: 'Player', isYou: false, investigator }
}

describe('keeperAttentionItems', () => {
  // specs/scenario-preparation/ux.md section 3; SP-UX-2.
  it('asks the Keeper to create a Scenario, after the other items, only while the Campaign has none', () => {
    const members = [
      keeper,
      player('p1', 'Ana Ruiz', { visibility: 'Visible', id: 'i1', name: 'Dr. Ames', status: 'Submitted' }),
    ]

    expect(keeperAttentionItems([keeper], 0)).toEqual([{ kind: 'invitePlayers' }, { kind: 'createScenario' }])
    expect(keeperAttentionItems(members, 0)).toEqual([
      { kind: 'review', investigatorId: 'i1', investigatorName: 'Dr. Ames', playerName: 'Ana Ruiz' },
      { kind: 'createScenario' },
    ])
    expect(keeperAttentionItems([keeper], 1)).toEqual([{ kind: 'invitePlayers' }])
    expect(keeperAttentionItems([keeper, player('p1', 'Ana Ruiz', null)], 2)).toEqual([])
  })

  it('asks the Keeper to invite Players when nobody has joined', () => {
    expect(keeperAttentionItems([keeper], 1)).toEqual([{ kind: 'invitePlayers' }])
  })

  it('lists one review item per Submitted Investigator, in roster order', () => {
    const members = [
      keeper,
      player('p1', 'Ana Ruiz', { visibility: 'Visible', id: 'i1', name: 'Dr. Ames', status: 'Submitted' }),
      player('p2', 'Ben Cole', { visibility: 'InProgress' }),
      player('p3', 'Cleo Park', { visibility: 'Visible', id: 'i3', name: 'Mae Doyle', status: 'Approved' }),
      player('p4', 'Dan Moss', { visibility: 'Visible', id: 'i4', name: null, status: 'Submitted' }),
      player('p5', 'Eve Shaw', { visibility: 'Visible', id: 'i5', name: 'Corbitt Hale', status: 'ChangesRequested' }),
      player('p6', 'Finn Lee', null),
    ]

    expect(keeperAttentionItems(members, 1)).toEqual([
      { kind: 'review', investigatorId: 'i1', investigatorName: 'Dr. Ames', playerName: 'Ana Ruiz' },
      { kind: 'review', investigatorId: 'i4', investigatorName: 'Unnamed Investigator', playerName: 'Dan Moss' },
    ])
  })

  it('has nothing for the Keeper when no Investigator waits for review', () => {
    expect(keeperAttentionItems([keeper, player('p1', 'Ana Ruiz', null)], 1)).toEqual([])
  })
})

const campaign: PlayerCampaign = { id: 'c1', name: 'Corbitt House', era: '1920s', allowedCreationMethods: ['PointBuy'], role: 'Player' }

function summary(status: InvestigatorStatus, name: string | null = 'Mae Doyle', changeRequestComment: string | null = null): InvestigatorSummary {
  return { id: 'i1', status, name, changeRequestComment, updatedAt: '2026-10-03T12:00:00Z' }
}

describe('playerAttentionItem', () => {
  it('asks a Player without an Investigator to create one', () => {
    expect(playerAttentionItem(campaign, null)).toEqual({ kind: 'create' })
  })

  it('asks a Player to create an Investigator whatever creation method the Campaign allows (PBI-CP-009)', () => {
    const rollingOnly: PlayerCampaign = { ...campaign, allowedCreationMethods: ['StandardRolling'] }

    expect(playerAttentionItem(rollingOnly, null)).toEqual({ kind: 'create' })
  })

  it('asks a Player to continue their Draft, naming it when it has a name', () => {
    expect(playerAttentionItem(campaign, summary('Draft'))).toEqual({ kind: 'continue', investigatorName: 'Mae Doyle' })
    expect(playerAttentionItem(campaign, summary('Draft', null))).toEqual({ kind: 'continue', investigatorName: null })
  })

  it("passes on the Keeper's Change Request comment", () => {
    expect(playerAttentionItem(campaign, summary('ChangesRequested', 'Mae Doyle', 'Lower the STR.'))).toEqual({
      kind: 'changesRequested',
      investigatorName: 'Mae Doyle',
      comment: 'Lower the STR.',
    })
  })

  it.each(['Submitted', 'Approved'] as const)('has nothing for a %s Investigator', (status) => {
    expect(playerAttentionItem(campaign, summary(status))).toBeNull()
  })
})
