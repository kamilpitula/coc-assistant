import { describe, expect, it } from 'vitest'

import { RICH_TEXT_MAX_BYTES } from '@/shared/services/richText'
import type { RichTextDocument } from '@/shared/types/RichText'

import { firstInvalidItemField, ITEM_FIELD_ORDER, validateItemForm } from './itemForm'

// specs/scenario-preparation/ux.md section 62; SP-UX-92: errors in field order, name trimmed, description needs visible text.
const text = (value: string) => ({ type: 'text', version: 1, text: value })
const document = (value: string): RichTextDocument => ({ root: { type: 'root', children: [{ type: 'paragraph', children: [text(value)] }] } })
const emptyParagraph: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } }
const tooLarge = document('a'.repeat(RICH_TEXT_MAX_BYTES))

const valid = { name: "Walter Corbitt's diary", playerFacingDescription: document('A leather diary'), keeperNotes: null }

describe('validateItemForm', () => {
  it('accepts a name and a description with visible text, and Keeper notes are optional', () => {
    expect(validateItemForm(valid)).toEqual({ success: true, data: valid })
  })

  it('sends the trimmed name', () => {
    const result = validateItemForm({ ...valid, name: '  The cellar key \t' })

    expect(result).toMatchObject({ success: true, data: { name: 'The cellar key' } })
  })

  it('keeps the Keeper notes when given', () => {
    const notes = document('The last page is torn out')

    expect(validateItemForm({ ...valid, keeperNotes: notes })).toMatchObject({ success: true, data: { keeperNotes: notes } })
  })

  it('asks for a name when it is empty or blank', () => {
    for (const name of ['', '   ']) {
      expect(validateItemForm({ ...valid, name })).toEqual({ success: false, errors: { name: 'Enter a name.' } })
    }
  })

  it('accepts a name of 200 characters, even with spaces around it, and refuses 201', () => {
    expect(validateItemForm({ ...valid, name: ` ${'n'.repeat(200)} ` }).success).toBe(true)
    expect(validateItemForm({ ...valid, name: 'n'.repeat(201) })).toEqual({
      success: false,
      errors: { name: 'Name must be 200 characters or fewer.' },
    })
  })

  it('asks for a Player-facing description when it is missing, empty, or has no visible text', () => {
    for (const playerFacingDescription of [null, emptyParagraph, document('   ')]) {
      expect(validateItemForm({ ...valid, playerFacingDescription })).toEqual({
        success: false,
        errors: { playerFacingDescription: 'Enter a Player-facing description.' },
      })
    }
  })

  it('refuses a description over the size the server accepts', () => {
    expect(validateItemForm({ ...valid, playerFacingDescription: tooLarge })).toEqual({
      success: false,
      errors: { playerFacingDescription: 'Player-facing description is too long. Shorten it and try again.' },
    })
  })

  it('refuses Keeper notes over the size the server accepts', () => {
    expect(validateItemForm({ ...valid, keeperNotes: tooLarge })).toEqual({
      success: false,
      errors: { keeperNotes: 'Keeper notes are too long. Shorten them and try again.' },
    })
  })

  it('reports every invalid field at once', () => {
    const result = validateItemForm({ name: '', playerFacingDescription: null, keeperNotes: tooLarge })

    expect(result).toEqual({
      success: false,
      errors: {
        name: 'Enter a name.',
        playerFacingDescription: 'Enter a Player-facing description.',
        keeperNotes: 'Keeper notes are too long. Shorten them and try again.',
      },
    })
  })
})

describe('firstInvalidItemField', () => {
  it('checks Name, then the Player-facing description, then the Keeper notes', () => {
    expect(ITEM_FIELD_ORDER).toEqual(['name', 'playerFacingDescription', 'keeperNotes'])
    expect(firstInvalidItemField({ keeperNotes: 'x', playerFacingDescription: 'y', name: 'z' })).toBe('name')
    expect(firstInvalidItemField({ keeperNotes: 'x', playerFacingDescription: 'y' })).toBe('playerFacingDescription')
    expect(firstInvalidItemField({ keeperNotes: 'x' })).toBe('keeperNotes')
    expect(firstInvalidItemField({})).toBeUndefined()
  })
})
