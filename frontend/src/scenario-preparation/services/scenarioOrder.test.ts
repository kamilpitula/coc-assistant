import { describe, expect, it } from 'vitest'

import { focusTargetAfterMove, movedAnnouncement, moveScenario, moveScenarioButtonId } from './scenarioOrder'

// specs/scenario-preparation/ux.md section 2.1; SP-UX-11, SP-UX-12, SP-A11Y-9.
describe('moveScenario', () => {
  const ids = ['a', 'b', 'c']

  it('moves a Scenario one place up', () => {
    expect(moveScenario(ids, 1, 'up')).toEqual(['b', 'a', 'c'])
  })

  it('moves a Scenario one place down', () => {
    expect(moveScenario(ids, 1, 'down')).toEqual(['a', 'c', 'b'])
  })

  it('leaves the order alone when the first Scenario moves up or the last moves down', () => {
    expect(moveScenario(ids, 0, 'up')).toEqual(['a', 'b', 'c'])
    expect(moveScenario(ids, 2, 'down')).toEqual(['a', 'b', 'c'])
  })

  it('does not change the list it was given', () => {
    moveScenario(ids, 0, 'down')

    expect(ids).toEqual(['a', 'b', 'c'])
  })
})

describe('movedAnnouncement', () => {
  it('names the Scenario, its new place, and the total', () => {
    expect(movedAnnouncement('Edge of Darkness', 1, 2)).toBe('Edge of Darkness moved to position 1 of 2.')
  })
})

describe('focusTargetAfterMove', () => {
  it('keeps focus on the same control while it still exists', () => {
    expect(focusTargetAfterMove('b', 'up', 1, 3)).toBe(moveScenarioButtonId('b', 'up'))
    expect(focusTargetAfterMove('b', 'down', 0, 3)).toBe(moveScenarioButtonId('b', 'down'))
  })

  it('moves focus to the other control when the Scenario became first (no Move up) or last (no Move down)', () => {
    expect(focusTargetAfterMove('b', 'up', 0, 3)).toBe(moveScenarioButtonId('b', 'down'))
    expect(focusTargetAfterMove('b', 'down', 2, 3)).toBe(moveScenarioButtonId('b', 'up'))
  })
})
