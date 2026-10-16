import { describe, expect, it } from 'vitest'

import { focusTargetAfterRemoval, removeWallEntryButtonId } from './wallEntryFocus'

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
