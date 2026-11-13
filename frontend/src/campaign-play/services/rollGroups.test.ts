import { describe, expect, it } from 'vitest'

import type { RollRecord } from '@/campaign-play/types/CharacterSheet'

import { displayGrantedGroups, grantableGroups, rollGroupOf } from './rollGroups'

function record(purpose: string, isReplaced = false): RollRecord {
  return { purpose, dice: '3D6', faces: null, result: 11, source: 'PlayerEntered', rolledByDisplayName: 'Ada', rolledAt: null, isReplaced }
}

/** specs/character-sheet/spec.md Re-roll grant: purposes map to their grantable group. */
describe('rollGroupOf', () => {
  it.each([
    ['Characteristic:STR', 'Characteristics'],
    ['Characteristic:EDU', 'Characteristics'],
    ['Luck', 'Luck'],
    ['Luck:SecondRoll', 'Luck'],
    ['EduImprovement[1].Check', 'EduImprovementChecks'],
    ['EduImprovement[2].Gain', 'EduImprovementChecks'],
  ] as const)('maps %s to %s', (purpose, group) => {
    expect(rollGroupOf(purpose)).toBe(group)
  })

  it.each(['SomethingElse', '', 'Characteristic:XYZ'])('maps %s to no group', (purpose) => {
    expect(rollGroupOf(purpose)).toBeNull()
  })
})

/** specs/character-sheet/ux.md section 7.1: the dialog offers only groups with current results, in grant order. */
describe('grantableGroups', () => {
  it('lists the groups that have a current record, in Characteristics, Luck, EDU checks order', () => {
    const records = [
      record('EduImprovement[1].Check'),
      record('Luck'),
      record('Characteristic:STR'),
      record('Characteristic:STR', true),
    ]

    expect(grantableGroups(records)).toEqual(['Characteristics', 'Luck', 'EduImprovementChecks'])
  })

  it('leaves out groups whose records are all replaced', () => {
    expect(grantableGroups([record('Luck', true), record('EduImprovement[1].Check')])).toEqual(['EduImprovementChecks'])
  })

  it('is empty when no group has a current record', () => {
    expect(grantableGroups([record('Luck', true)])).toEqual([])
  })
})

/** specs/character-sheet/ux.md section 6.8 (U3): the grant line names the groups in grant order. */
describe('displayGrantedGroups', () => {
  it('joins the group names with ", " in Characteristics, Luck, EDU checks order', () => {
    expect(displayGrantedGroups(['EduImprovementChecks', 'Characteristics'])).toBe('characteristics, EDU checks')
  })
})
