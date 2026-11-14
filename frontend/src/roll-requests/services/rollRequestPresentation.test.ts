import { describe, expect, it } from 'vitest'

import type { RequestedRoll, RollRequest, RollRequestTarget } from '@/roll-requests/types/RollRequest'

import {
  describeDice,
  describeFaces,
  describeOutcome,
  describeTargets,
  hiddenRollStatus,
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

// specs/roll-requests/ux.md section 3.1; RR-UX-18. The status comes from the 201 response, in the request's row order.
describe('hiddenRollStatus', () => {
  const psychology: RollRequestTarget = { kind: 'Skill', skill: 'Psychology', specialization: null, characteristic: null }

  function rolled(
    investigatorId: string,
    investigatorName: string | null,
    result: number,
    successLevel: 'Regular' | 'Hard' | 'Extreme' | 'Critical' | 'Failure' | 'Fumble',
    isSuccess: boolean,
    difficulty: 'Regular' | 'Hard' | 'Extreme' = 'Regular',
  ): RequestedRoll {
    return {
      investigatorId,
      investigatorName,
      targetValue: 60,
      usesBaseValue: false,
      canEarnExperienceCheck: true,
      difficulty,
      bonusDice: 0,
      penaltyDice: 0,
      status: 'Rolled',
      rolls: [
        {
          dice: '1D100',
          result,
          faces: [30, 4],
          rolledBy: 'The Keeper',
          rolledAt: '2026-11-13T19:45:00Z',
          percentile: { unitsFace: 4, tensFaces: [30], keptTens: 30, result, successLevel, isSuccess },
          earnsExperienceCheck: false,
        },
      ],
    }
  }

  function hiddenRequest(rolls: RequestedRoll[]): RollRequest {
    return {
      id: 'r1',
      target: psychology,
      message: null,
      visibility: 'KeeperOnly',
      difficulty: 'Regular',
      bonusDice: 0,
      penaltyDice: 0,
      createdAt: '2026-11-13T19:40:00Z',
      requestedRolls: rolls,
    }
  }

  it('names one Investigator with the target, result, and outcome', () => {
    expect(hiddenRollStatus(hiddenRequest([rolled('i1', 'Harvey Walters', 34, 'Regular', true)]))).toBe(
      'Psychology hidden roll: Harvey Walters rolled 34: Regular success.',
    )
  })

  it('joins two and three Investigators in row order', () => {
    expect(
      hiddenRollStatus(
        hiddenRequest([
          rolled('i1', 'Harvey Walters', 34, 'Regular', true),
          rolled('i2', 'Lucy Ward', 81, 'Failure', false),
        ]),
      ),
    ).toBe('Psychology hidden roll: Harvey Walters rolled 34: Regular success; Lucy Ward rolled 81: Failure.')
    expect(
      hiddenRollStatus(
        hiddenRequest([
          rolled('i1', 'Harvey Walters', 34, 'Regular', true),
          rolled('i2', 'Lucy Ward', 81, 'Failure', false),
          rolled('i3', 'Cy Holloway', 1, 'Critical', true),
        ]),
      ),
    ).toBe(
      'Psychology hidden roll: Harvey Walters rolled 34: Regular success; Lucy Ward rolled 81: Failure; Cy Holloway rolled 1: Critical success.',
    )
  })

  it('names an unnamed Investigator "Unnamed Investigator"', () => {
    expect(hiddenRollStatus(hiddenRequest([rolled('i1', null, 34, 'Regular', true)]))).toBe(
      'Psychology hidden roll: Unnamed Investigator rolled 34: Regular success.',
    )
  })

  it.each([
    ['Regular', false, 'Hard', 'Regular - not enough for Hard'],
    ['Failure', false, 'Regular', 'Failure'],
    ['Fumble', false, 'Regular', 'Fumble'],
  ])('reads a %s roll at %s difficulty as "%s"', (successLevel, isSuccess, difficulty, outcome) => {
    expect(
      hiddenRollStatus(
        hiddenRequest([
          rolled('i1', 'Harvey Walters', 81, successLevel as 'Regular' | 'Failure' | 'Fumble', isSuccess, difficulty as 'Regular' | 'Hard'),
        ]),
      ),
    ).toBe(`Psychology hidden roll: Harvey Walters rolled 81: ${outcome}.`)
  })
})
