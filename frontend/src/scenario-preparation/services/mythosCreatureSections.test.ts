import { describe, expect, it } from 'vitest'

import { sectionAnchorId, sectionIndexEntries } from './mythosCreatureSections'

// specs/scenario-preparation/ux.md section 25.5 (Section index); SP-UX-45.

describe('sectionIndexEntries', () => {
  it('always lists Details and Keeper notes around the present sections in the fixed order', () => {
    expect(sectionIndexEntries(['sanityLoss', 'characteristics'])).toEqual([
      { id: 'section-details', label: 'Details' },
      { id: 'section-characteristics', label: 'Characteristics' },
      { id: 'section-sanityLoss', label: 'Sanity loss' },
      { id: 'section-keeper-notes', label: 'Keeper notes' },
    ])
    expect(sectionIndexEntries([]).map((entry) => entry.label)).toEqual(['Details', 'Keeper notes'])
  })

  it('gives every section a distinct anchor id', () => {
    expect(sectionAnchorId('keeperNotes')).toBe('section-keeper-notes')
    expect(sectionAnchorId('powers')).toBe('section-powers')
  })
})
