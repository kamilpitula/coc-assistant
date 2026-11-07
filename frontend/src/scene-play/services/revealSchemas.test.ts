import { describe, expect, it } from 'vitest'

import { cluesSchema, keeperRevealSchema, playerRevealSchema } from './revealSchemas'

// PBI-SPL-002 D5: a Player view carries no subject id, no recipients, and no other Investigator's id.
const reveal = {
  revealId: 'r1',
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title: 'The front door',
  handoutKind: 'ReadAloud',
  content: { root: { type: 'root', children: [] } },
  file: null,
  imageDescription: null,
}

describe('reveal schemas', () => {
  it('accepts a Player Reveal, with or without a file', () => {
    expect(playerRevealSchema.safeParse(reveal).success).toBe(true)
    expect(playerRevealSchema.safeParse({ ...reveal, file: { name: 'a.png', mediaType: 'image/png', sizeBytes: 1 }, content: null }).success).toBe(true)
  })

  it('rejects a Player Reveal that names a subject id, recipients, or an Investigator id', () => {
    for (const extra of [{ subjectId: 's' }, { recipients: [] }, { investigatorId: 'i' }]) {
      expect(playerRevealSchema.safeParse({ ...reveal, ...extra }).success).toBe(false)
    }
  })

  it('accepts an Item Reveal, whose kind and file are always null (PBI-SPL-003)', () => {
    expect(playerRevealSchema.safeParse({ ...reveal, subjectType: 'Item', handoutKind: null, content: null }).success).toBe(true)
  })

  it('rejects an unknown subject type and an unknown Handout kind', () => {
    expect(playerRevealSchema.safeParse({ ...reveal, subjectType: 'Gear' }).success).toBe(false)
    expect(playerRevealSchema.safeParse({ ...reveal, handoutKind: 'Video' }).success).toBe(false)
  })

  it('requires the subject id and recipients on a Keeper Reveal', () => {
    const keeper = { ...reveal, subjectId: 'h1', recipients: [{ id: 'i1', name: null }] }

    expect(keeperRevealSchema.safeParse(keeper).success).toBe(true)
    expect(keeperRevealSchema.safeParse(reveal).success).toBe(false)
    expect(keeperRevealSchema.safeParse({ ...keeper, recipients: [{ id: 'i1' }] }).success).toBe(false)
  })

  it('accepts Clues with their Scene, and rejects a Clue without one or with a recipient list', () => {
    const clue = { ...reveal, scene: { id: 's1', title: 'The Corbitt House' } }

    expect(cluesSchema.safeParse({ investigatorName: 'Harvey Walters', clues: [clue] }).success).toBe(true)
    expect(cluesSchema.safeParse({ investigatorName: null, clues: [reveal] }).success).toBe(false)
    expect(cluesSchema.safeParse({ investigatorName: null, clues: [{ ...clue, recipients: [] }] }).success).toBe(false)
  })
})
