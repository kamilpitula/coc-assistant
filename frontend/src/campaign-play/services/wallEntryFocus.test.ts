import { describe, expect, it } from 'vitest'

import { focusTargetAfterLiveRemoval, focusTargetAfterRemoval, removeWallEntryButtonId } from './wallEntryFocus'

// specs/campaign-wall/ux.md section 4.3: focus goes to the following entry's Remove, else the previous one, else the text box.
const entries = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

describe('focusTargetAfterRemoval', () => {
  it('moves to the Remove button of the entry that followed', () => {
    expect(focusTargetAfterRemoval(entries, 'b', 'text-box')).toBe(removeWallEntryButtonId('c'))
  })

  it('moves to the previous entry when the last one was removed', () => {
    expect(focusTargetAfterRemoval(entries, 'c', 'text-box')).toBe(removeWallEntryButtonId('b'))
  })

  it('moves to the text box when no entry is left', () => {
    expect(focusTargetAfterRemoval([{ id: 'a' }], 'a', 'text-box')).toBe('text-box')
  })
})

// specs/campaign-wall/ux.md section 4.5 and WL-A11Y-11: a live removal moves focus only off the removed entry's own button.
describe('focusTargetAfterLiveRemoval', () => {
  it('moves focus on from the Remove button of an entry that is gone', () => {
    const next = [{ id: 'a' }, { id: 'c' }]

    expect(focusTargetAfterLiveRemoval(entries, next, removeWallEntryButtonId('b'), 'text-box')).toBe(removeWallEntryButtonId('c'))
  })

  it('skips neighbours that were removed in the same refetch', () => {
    expect(focusTargetAfterLiveRemoval(entries, [{ id: 'c' }], removeWallEntryButtonId('a'), 'text-box')).toBe(removeWallEntryButtonId('c'))
    expect(focusTargetAfterLiveRemoval(entries, [], removeWallEntryButtonId('a'), 'text-box')).toBe('text-box')
  })

  it('does nothing when focus is elsewhere or its entry is still there', () => {
    expect(focusTargetAfterLiveRemoval(entries, [{ id: 'a' }, { id: 'c' }], 'text-box', 'text-box')).toBeNull()
    expect(focusTargetAfterLiveRemoval(entries, entries, removeWallEntryButtonId('b'), 'text-box')).toBeNull()
    expect(focusTargetAfterLiveRemoval(entries, entries, undefined, 'text-box')).toBeNull()
  })
})
