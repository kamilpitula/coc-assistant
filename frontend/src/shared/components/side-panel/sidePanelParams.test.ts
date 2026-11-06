import { describe, expect, it } from 'vitest'

import { PANEL_TYPES, sidePanelSearchSchema, toOpenPanel, toPanelSearch, type OpenPanel } from './sidePanelParams'

// specs/navigation/ux.md section 3 and PBI-NAV-002 design record D1: panel params carry identifiers only,
// every key is optional, and invalid params open no panel, silently.
describe('sidePanelSearchSchema', () => {
  it('accepts an empty search', () => {
    expect(sidePanelSearchSchema.parse({})).toEqual({})
  })

  it('accepts each panel type with its identifier', () => {
    expect(sidePanelSearchSchema.parse({ panel: 'clues', investigator: 'inv-1' })).toEqual({ panel: 'clues', investigator: 'inv-1' })
    expect(sidePanelSearchSchema.parse({ panel: 'entity', link: 'link-1' })).toEqual({ panel: 'entity', link: 'link-1' })
    expect(sidePanelSearchSchema.parse({ panel: 'handout', handout: 'h-1' })).toEqual({ panel: 'handout', handout: 'h-1' })
    expect(sidePanelSearchSchema.parse({ panel: 'reveal', reveal: 'r-1' })).toEqual({ panel: 'reveal', reveal: 'r-1' })
    expect(sidePanelSearchSchema.parse({ panel: 'item', item: 'k-1' })).toEqual({ panel: 'item', item: 'k-1' })
  })

  it('accepts a clues panel without an investigator for a Player', () => {
    expect(sidePanelSearchSchema.parse({ panel: 'clues' })).toEqual({ panel: 'clues' })
  })

  it('never throws, degrading garbage to undefined keys', () => {
    expect(sidePanelSearchSchema.parse({ panel: 'unknown', investigator: 42, link: ['x'] })).toEqual({
      panel: undefined,
      investigator: undefined,
      link: undefined,
    })
  })
})

describe('toOpenPanel', () => {
  it('round-trips each panel type', () => {
    const panels: OpenPanel[] = [
      { type: 'clues', investigatorId: 'inv-1' },
      { type: 'clues' },
      { type: 'entity', linkId: 'link-1' },
      { type: 'handout', handoutId: 'h-1' },
      { type: 'reveal', revealId: 'r-1' },
      { type: 'item', itemId: 'k-1' },
    ]
    for (const panel of panels) {
      expect(toOpenPanel(sidePanelSearchSchema.parse(toPanelSearch(panel)))).toEqual(panel)
    }
  })

  it('opens the clues panel with or without an investigator', () => {
    expect(toOpenPanel({ panel: 'clues', investigator: 'inv-1' })).toEqual({ type: 'clues', investigatorId: 'inv-1' })
    expect(toOpenPanel({ panel: 'clues' })).toEqual({ type: 'clues' })
  })

  it('opens no panel for an unknown type or a missing identifier', () => {
    expect(toOpenPanel({})).toBeNull()
    expect(toOpenPanel({ panel: undefined })).toBeNull()
    expect(toOpenPanel({ panel: 'entity' })).toBeNull()
    expect(toOpenPanel({ panel: 'handout' })).toBeNull()
    expect(toOpenPanel({ panel: 'reveal' })).toBeNull()
    expect(toOpenPanel({ panel: 'item' })).toBeNull()
  })

  it('lists the five panel types', () => {
    expect([...PANEL_TYPES]).toEqual(['clues', 'entity', 'handout', 'reveal', 'item'])
  })
})
