import { describe, expect, it } from 'vitest'

import type { KeeperReveal, PlayerReveal } from '@/scene-play/types/Reveal'

import { joinNames, newHeldItemsAnnouncement, newRevealAnnouncement, recipientNames, recipientsOfSubject, revealKindLabel } from './revealPresentation'

// specs/scene-play/ux.md sections 12, 14, and 17; SPL-UX-22, SPL-UX-28.

const reveal = (id: string, overrides: Partial<KeeperReveal> = {}): KeeperReveal => ({
  revealId: id,
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title: `Title ${id}`,
  handoutKind: 'ReadAloud',
  content: null,
  file: null,
  imageDescription: null,
  subjectId: 'h1',
  recipients: [],
  ...overrides,
})

describe('joinNames', () => {
  it('joins one, two, and three or more names as "A", "A and B", and "A, B, and C"', () => {
    expect(joinNames(['A'])).toBe('A')
    expect(joinNames(['A', 'B'])).toBe('A and B')
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B, and C')
  })

  it('calls a missing name "Unnamed Investigator"', () => {
    expect(joinNames([null, 'Lucy Ward'])).toBe('Unnamed Investigator and Lucy Ward')
  })
})

describe('revealKindLabel', () => {
  it('names the Handout kind, an Item, or "Non-Player Entity" when there is no kind (SPL-UX-51)', () => {
    expect(revealKindLabel(reveal('1'))).toBe('Read-aloud')
    expect(revealKindLabel(reveal('2', { subjectType: 'NonPlayerEntity', handoutKind: null }))).toBe('Non-Player Entity')
    expect(revealKindLabel(reveal('3', { subjectType: 'Item', handoutKind: null }))).toBe('Item')
  })
})

describe('recipientsOfSubject', () => {
  const present = [
    { id: 'a', name: 'Harvey Walters' },
    { id: 'b', name: 'Lucy Ward' },
  ]

  it('is the union of the recipients of the subject, in roster order, with Investigators no longer present last', () => {
    const reveals = [
      reveal('1', { recipients: [{ id: 'b', name: 'Lucy Ward' }, { id: 'z', name: 'Gone' }] }),
      reveal('2', { recipients: [{ id: 'a', name: 'Harvey Walters' }] }),
      reveal('3', { subjectId: 'other', recipients: [{ id: 'q', name: 'Not counted' }] }),
    ]

    expect(recipientsOfSubject(reveals, 'h1', present).map((recipient) => recipient.id)).toEqual(['a', 'b', 'z'])
    expect(recipientsOfSubject(reveals, 'none', present)).toEqual([])
  })

  it('lists the names of one Reveal', () => {
    const both = reveal('1', { recipients: [{ id: 'a', name: 'Harvey Walters' }, { id: 'b', name: 'Lucy Ward' }] })

    expect(recipientNames(both)).toBe('Harvey Walters and Lucy Ward')
  })
})

describe('newRevealAnnouncement', () => {
  const player = (id: string): PlayerReveal => reveal(id)

  it('names the one new Reveal, counts several, and is silent without a new one', () => {
    expect(newRevealAnnouncement(new Set(['1']), [player('1'), player('2')], 'Harvey Walters')).toBe('New for Harvey Walters: Title 2.')
    expect(newRevealAnnouncement(new Set(), [player('1'), player('2')], 'Harvey Walters')).toBe('2 new for Harvey Walters.')
    expect(newRevealAnnouncement(new Set(['1']), [player('1')], 'Harvey Walters')).toBeNull()
    expect(newRevealAnnouncement(new Set(), [player('1')], null)).toBe('New for Unnamed Investigator: Title 1.')
  })
})

describe('newHeldItemsAnnouncement', () => {
  const item = (revealId: string, name = `Item ${revealId}`) => ({ revealId, name })

  it('names the one gained Item, the one taken-back Item, counts several changes, and is silent otherwise (SPL-UX-52, SPL-UX-54)', () => {
    expect(newHeldItemsAnnouncement(new Map(), [item('1', "Walter Corbitt's diary")], 'Harvey Walters')).toBe(
      "Harvey Walters now holds Walter Corbitt's diary.",
    )
    expect(newHeldItemsAnnouncement(new Map([['1', "Walter Corbitt's diary"]]), [], 'Harvey Walters')).toBe(
      "Walter Corbitt's diary was taken back from Harvey Walters.",
    )
    expect(
      newHeldItemsAnnouncement(new Map([['1', 'Item 1']]), [item('2'), item('3')], 'Harvey Walters'),
    ).toBe('3 Items changed for Harvey Walters.')
    expect(newHeldItemsAnnouncement(new Map([['1', 'Item 1']]), [item('1')], 'Harvey Walters')).toBeNull()
    expect(newHeldItemsAnnouncement(new Map(), [item('1')], null)).toBe('Unnamed Investigator now holds Item 1.')
  })
})
