import { describe, expect, it } from 'vitest'

import type { RollRequestTarget } from '@/roll-requests/types/RollRequest'

import {
  describeDice,
  describeFaces,
  describeOutcome,
  describeTargets,
  joinInvestigatorNames,
  rollTargetName,
} from './rollRequestPresentation'

// specs/roll-requests/ux.md sections 4 and 5; RR-UX-10, RR-UX-11.
describe('roll request presentation', () => {
  it.each([
    [0, 0, 'no Bonus or Penalty Dice'],
    [1, 0, '1 Bonus Die'],
    [2, 0, '2 Bonus Dice'],
    [0, 1, '1 Penalty Die'],
    [0, 2, '2 Penalty Dice'],
    [1, 1, '1 Bonus Die, 1 Penalty Die'],
  ])('names the dice for %i Bonus and %i Penalty Dice', (bonusDice, penaltyDice, copy) => {
    expect(describeDice(bonusDice, penaltyDice)).toBe(copy)
  })

  it.each([
    ['Critical', true, 'Regular', 'Critical success'],
    ['Extreme', true, 'Extreme', 'Extreme success'],
    ['Hard', true, 'Hard', 'Hard success'],
    ['Regular', true, 'Regular', 'Regular success'],
    ['Regular', false, 'Hard', 'Regular - not enough for Hard'],
    ['Regular', false, 'Extreme', 'Regular - not enough for Extreme'],
    ['Hard', false, 'Extreme', 'Hard - not enough for Extreme'],
    ['Failure', false, 'Regular', 'Failure'],
    ['Fumble', false, 'Regular', 'Fumble'],
  ])('names the outcome for %s at %s difficulty', (successLevel, isSuccess, difficulty, copy) => {
    expect(
      describeOutcome(
        successLevel as 'Critical' | 'Extreme' | 'Hard' | 'Regular' | 'Failure' | 'Fumble',
        isSuccess,
        difficulty as 'Regular' | 'Hard' | 'Extreme',
      ),
    ).toBe(copy)
  })

  it('reads one tens die as "Tens {t}, units {u} = {result}" with two-digit tens', () => {
    expect(describeFaces({ unitsFace: 5, tensFaces: [20], result: 25 })).toBe('Tens 20, units 5 = 25')
    expect(describeFaces({ unitsFace: 0, tensFaces: [0], result: 100 })).toBe('Tens 00, units 0 = 100')
  })

  it('reads two tens dice as "Tens {t1} and {t2}, units {u} - kept {result}"', () => {
    expect(describeFaces({ unitsFace: 5, tensFaces: [80, 20], result: 25 })).toBe(
      'Tens 80 and 20, units 5 - kept 25',
    )
  })

  it.each([
    [['Harvey Walters'], 'Harvey Walters'],
    [['Harvey Walters', 'Lucy Ward'], 'Harvey Walters and Lucy Ward'],
    [['Harvey Walters', 'Lucy Ward', 'Cy Holloway'], 'Harvey Walters, Lucy Ward and Cy Holloway'],
  ])('joins %s as "%s" (specs/roll-requests/ux.md section 3)', (names, joined) => {
    expect(joinInvestigatorNames(names)).toBe(joined)
  })
  it('derives the Hard and Extreme targets from the snapshot value (skill rolls section 2)', () => {
    expect(describeTargets(60)).toBe('60 / 30 / 12')
    expect(describeTargets(45)).toBe('45 / 22 / 9')
  })

  it.each([
    [{ kind: 'Skill', skill: 'Spot Hidden', specialization: null, characteristic: null } as RollRequestTarget, 'Spot Hidden'],
    [{ kind: 'Skill', skill: 'Language', specialization: 'Latin', characteristic: null } as RollRequestTarget, 'Language (Latin)'],
    [{ kind: 'Characteristic', skill: null, specialization: null, characteristic: 'DEX' } as RollRequestTarget, 'DEX'],
    [{ kind: 'Luck', skill: null, specialization: null, characteristic: null } as RollRequestTarget, 'Luck'],
  ])('names the target %o', (target, name) => {
    expect(rollTargetName(target)).toBe(name)
  })
})
