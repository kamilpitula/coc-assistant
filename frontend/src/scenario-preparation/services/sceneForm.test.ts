import { describe, expect, it } from 'vitest'

import { validateSceneForm } from '@/scenario-preparation/services/sceneForm'
import type { RichTextDocument } from '@/shared/types/RichText'

// specs/scenario-preparation/ux.md section 13; SP-UX-17.
const notes = (text: string): RichTextDocument => ({
  root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] },
})

describe('validateSceneForm', () => {
  it('trims the title and location and keeps the notes', () => {
    const result = validateSceneForm({ title: '  The Corbitt House ', location: ' Arkham ', keeperNotes: notes('x') })

    expect(result).toEqual({ success: true, data: { title: 'The Corbitt House', location: 'Arkham', keeperNotes: notes('x') } })
  })

  it('accepts an empty location and no notes', () => {
    expect(validateSceneForm({ title: 'T', location: '', keeperNotes: null }).success).toBe(true)
  })

  it.each(['', '   \t '])('refuses the blank title %j', (title) => {
    const result = validateSceneForm({ title, location: '', keeperNotes: null })

    expect(result).toEqual({ success: false, errors: { title: 'Enter a title.' } })
  })

  it('accepts 200 characters and refuses 201 for the title and the location', () => {
    expect(validateSceneForm({ title: 't'.repeat(200), location: 'l'.repeat(200), keeperNotes: null }).success).toBe(true)

    const result = validateSceneForm({ title: 't'.repeat(201), location: 'l'.repeat(201), keeperNotes: null })

    expect(result).toEqual({
      success: false,
      errors: {
        title: 'Title must be 200 characters or fewer.',
        location: 'Location must be 200 characters or fewer.',
      },
    })
  })

  it('refuses notes over 204,800 bytes and accepts notes at the limit', () => {
    const overhead = JSON.stringify(notes('')).length
    const atLimit = notes('a'.repeat(204_800 - overhead))
    const over = notes('a'.repeat(204_801 - overhead))

    expect(validateSceneForm({ title: 'T', location: '', keeperNotes: atLimit }).success).toBe(true)
    expect(validateSceneForm({ title: 'T', location: '', keeperNotes: over })).toEqual({
      success: false,
      errors: { keeperNotes: 'Keeper notes are too long. Shorten them and try again.' },
    })
  })
})
