import { describe, expect, it } from 'vitest'

import { focusTargetAfterMove, movedAnnouncement, moveButtonId, moveItem } from './preparedOrder'

// specs/scenario-preparation/ux.md sections 2.1 and 12; SP-UX-11, SP-UX-12, SP-UX-24, SP-A11Y-9.
describe('moveItem', () => {
  const ids = ['a', 'b', 'c']

  it('moves a Scenario one place up', () => {
    expect(moveItem(ids, 1, 'up')).toEqual(['b', 'a', 'c'])
  })

  it('moves a Scenario one place down', () => {
    expect(moveItem(ids, 1, 'down')).toEqual(['a', 'c', 'b'])
  })

  it('leaves the order alone when the first Scenario moves up or the last moves down', () => {
    expect(moveItem(ids, 0, 'up')).toEqual(['a', 'b', 'c'])
    expect(moveItem(ids, 2, 'down')).toEqual(['a', 'b', 'c'])
  })

  it('does not change the list it was given', () => {
    moveItem(ids, 0, 'down')

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
    expect(focusTargetAfterMove('scenario', 'b', 'up', 1, 3)).toBe(moveButtonId('scenario', 'b', 'up'))
    expect(focusTargetAfterMove('scenario', 'b', 'down', 0, 3)).toBe(moveButtonId('scenario', 'b', 'down'))
  })

  it('moves focus to the other control when the Scenario became first (no Move up) or last (no Move down)', () => {
    expect(focusTargetAfterMove('scenario', 'b', 'up', 0, 3)).toBe(moveButtonId('scenario', 'b', 'down'))
    expect(focusTargetAfterMove('scenario', 'b', 'down', 2, 3)).toBe(moveButtonId('scenario', 'b', 'up'))
  })
})

describe('moveButtonId', () => {
  it('keeps the Scenario format and has the same shape for Scenes', () => {
    expect(moveButtonId('scenario', 'a1', 'up')).toBe('move-scenario-up-a1')
    expect(moveButtonId('scene', 'a1', 'down')).toBe('move-scene-down-a1')
  })
})
