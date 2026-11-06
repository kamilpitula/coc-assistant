import { describe, expect, it } from 'vitest'

import type { CampaignMember } from '@/campaign-play/types/CampaignMember'

import { approvedInvestigatorNames } from './investigatorNames'

const member = (overrides: Partial<CampaignMember> = {}): CampaignMember => ({
  memberId: 'm1',
  displayName: 'Ana Ruiz',
  role: 'Player',
  isYou: false,
  investigator: null,
  ...overrides,
})

describe('approvedInvestigatorNames', () => {
  it('maps Approved and Visible Investigators by id, falling back to "Unnamed Investigator" (PBI-SPL-003)', () => {
    const names = approvedInvestigatorNames([
      member({ investigator: { visibility: 'Visible', id: 'i1', name: 'Harvey Walters', status: 'Approved' } }),
      member({ memberId: 'm2', investigator: { visibility: 'Visible', id: 'i2', name: null, status: 'Approved' } }),
    ])

    expect(names).toEqual(
      new Map([
        ['i1', 'Harvey Walters'],
        ['i2', 'Unnamed Investigator'],
      ]),
    )
  })

  it('skips the Keeper, unsubmitted Investigators, and members without an Investigator id', () => {
    const names = approvedInvestigatorNames([
      member({ memberId: 'k', displayName: 'Eleanor Hart', role: 'Keeper', isYou: true, investigator: null }),
      member({ memberId: 'm2', investigator: { visibility: 'Visible', id: 'i2', name: 'Mae Doyle', status: 'Submitted' } }),
      member({ memberId: 'm3', investigator: { visibility: 'Visible', id: undefined, name: 'Dr. Ames', status: 'Approved' } }),
      member({ memberId: 'm4', investigator: { visibility: 'InProgress' } }),
      member({ memberId: 'm5' }),
    ])

    expect(names).toEqual(new Map())
  })

  it('resolves no members to an empty map', () => {
    expect(approvedInvestigatorNames(null)).toEqual(new Map())
    expect(approvedInvestigatorNames(undefined)).toEqual(new Map())
  })
})
