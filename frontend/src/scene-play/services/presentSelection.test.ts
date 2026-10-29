import { describe, expect, it } from 'vitest'

import { keeperRosterAllApproved, keeperRosterWithReviews } from '@/campaign-play/test-support/rosterFixtures'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'

import { approvedInvestigatorsFrom, initialSelection, toggled } from './presentSelection'

// specs/scene-play/ux.md section 2: the Approved Investigators come from the roster, and the pre-check follows the Active Scene.
const active: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 's',
  scenarioId: 'p',
  scenarioTitle: 'T',
  title: 'Meeting Knott',
  location: '',
  startedAt: null,
  investigatorsPresent: [{ id: 'i-c', name: 'Mae Doyle' }],
  reveals: [],
}

describe('approvedInvestigatorsFrom', () => {
  it('lists only Approved Investigators with their id, name, and Player name, in roster order', () => {
    expect(approvedInvestigatorsFrom(keeperRosterAllApproved)).toEqual([
      { id: 'i-a', name: 'Dr. Ames', playerName: 'Ana Ruiz' },
      { id: 'i-c', name: 'Mae Doyle', playerName: 'Cleo Park' },
    ])
    expect(approvedInvestigatorsFrom(keeperRosterWithReviews)).toEqual([{ id: 'i-c', name: 'Mae Doyle', playerName: 'Cleo Park' }])
  })

  it('is empty without a roster', () => {
    expect(approvedInvestigatorsFrom(undefined)).toEqual([])
    expect(approvedInvestigatorsFrom(null)).toEqual([])
  })
})

describe('initialSelection', () => {
  const approved = approvedInvestigatorsFrom(keeperRosterAllApproved)

  it('checks every Approved Investigator when no Scene is Active', () => {
    expect(initialSelection(approved, null)).toEqual(['i-a', 'i-c'])
  })

  it('checks the Investigators present in the Active Scene, and only those still Approved', () => {
    expect(initialSelection(approved, active)).toEqual(['i-c'])
    expect(initialSelection(approved, { ...active, investigatorsPresent: [{ id: 'gone', name: null }] })).toEqual([])
  })
})

describe('toggled', () => {
  it('adds and removes an id without changing the original', () => {
    const original = ['a']

    expect(toggled(original, 'b', true)).toEqual(['a', 'b'])
    expect(toggled(original, 'a', false)).toEqual([])
    expect(toggled(original, 'a', true)).toEqual(['a'])
    expect(original).toEqual(['a'])
  })
})
