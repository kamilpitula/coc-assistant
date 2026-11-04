import { describe, expect, it } from 'vitest'

import { closePanelNavigation, openPanelNavigation, type SidePanelHistoryState } from './sidePanelHistory'

// PBI-NAV-002 design record D2: opening pushes with the marker, opening-while-open replaces and keeps it,
// closing goes back with the marker and replaces without it.
describe('openPanelNavigation', () => {
  it('pushes the panel params with the marker and keeps the status message', () => {
    const state: SidePanelHistoryState = { statusMessage: 'Draft saved.' }

    expect(openPanelNavigation({ type: 'clues', investigatorId: 'inv-1' }, state, false)).toEqual({
      search: { panel: 'clues', investigator: 'inv-1' },
      state: { statusMessage: 'Draft saved.', sidePanelOpenedHere: true },
      replace: false,
    })
  })

  it('replaces when a panel is already open and keeps the marker', () => {
    const state: SidePanelHistoryState = { statusMessage: 'Draft saved.', sidePanelOpenedHere: true }

    const navigation = openPanelNavigation({ type: 'handout', handoutId: 'h-1' }, state, true)

    expect(navigation.replace).toBe(true)
    expect(navigation.search).toEqual({ panel: 'handout', handout: 'h-1' })
    expect(navigation.state).toEqual({ statusMessage: 'Draft saved.', sidePanelOpenedHere: true })
  })
})

describe('closePanelNavigation', () => {
  it('goes back when the marker is present', () => {
    expect(closePanelNavigation({ panel: 'clues', investigator: 'inv-1' }, { sidePanelOpenedHere: true })).toEqual({ back: true })
  })

  it('replaces without the panel params and keeps the state when the marker is absent', () => {
    expect(closePanelNavigation({ panel: 'clues', investigator: 'inv-1', other: 'kept' }, {})).toEqual({
      back: false,
      search: { other: 'kept' },
      state: { sidePanelOpenedHere: undefined },
      replace: true,
    })
  })

  it('keeps the status message on a marker-less close', () => {
    const navigation = closePanelNavigation({}, { statusMessage: 'Draft saved.' })

    expect(navigation).toEqual({
      back: false,
      search: {},
      state: { statusMessage: 'Draft saved.', sidePanelOpenedHere: undefined },
      replace: true,
    })
  })
})
