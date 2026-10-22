import { describe, expect, it } from 'vitest'

import { RICH_TEXT_MAX_BYTES } from '@/shared/services/richText'
import type { RichTextDocument } from '@/shared/types/RichText'

import { firstInvalidField, validateHandoutForm, type HandoutFormValues } from './handoutForm'

// specs/scenario-preparation/ux.md section 43 (fields and validation order), SP-UX-66, SP-UX-67, SP-A11Y-40.

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const document = (value: string): RichTextDocument => ({ root: { type: 'root', children: [{ type: 'paragraph', children: [text(value)] }] } })
const emptyParagraph: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', children: [] }] } }

const valid: HandoutFormValues = { title: 'The front door', kind: 'ReadAloud', visibility: 'PlayerFacing', content: document('You stand before it.') }

describe('validateHandoutForm', () => {
  it('returns the trimmed title with the chosen kind, visibility, and text', () => {
    const result = validateHandoutForm({ ...valid, title: '  The front door ' })

    expect(result).toEqual({ success: true, data: { title: 'The front door', kind: 'ReadAloud', visibility: 'PlayerFacing', content: valid.content } })
  })

  it('asks for a title when it is empty or blank and when it is longer than 200 characters', () => {
    expect(validateHandoutForm({ ...valid, title: '   ' })).toEqual({ success: false, errors: { title: 'Enter a title.' } })
    expect(validateHandoutForm({ ...valid, title: 'a'.repeat(201) })).toEqual({
      success: false,
      errors: { title: 'Title must be 200 characters or fewer.' },
    })
    expect(validateHandoutForm({ ...valid, title: 'a'.repeat(200) }).success).toBe(true)
  })

  it('refuses a form with no kind or no visibility, because neither has a default (SP-UX-67)', () => {
    expect(validateHandoutForm({ ...valid, kind: null })).toEqual({ success: false, errors: { kind: 'Choose Read-aloud or Text.' } })
    expect(validateHandoutForm({ ...valid, visibility: null })).toEqual({
      success: false,
      errors: { visibility: 'Choose who can see this Handout.' },
    })
  })

  it('refuses no text, an empty paragraph, and text of only whitespace', () => {
    for (const content of [null, emptyParagraph, document('   \t')]) {
      expect(validateHandoutForm({ ...valid, content })).toEqual({ success: false, errors: { content: 'Enter the Handout text.' } })
    }
  })

  it('refuses text over the byte limit with its own message', () => {
    const result = validateHandoutForm({ ...valid, content: document('a'.repeat(RICH_TEXT_MAX_BYTES)) })

    expect(result).toEqual({ success: false, errors: { content: 'The text is too long. Shorten it and try again.' } })
  })

  it('reports every invalid field at once, in field order', () => {
    const result = validateHandoutForm({ title: '', kind: null, visibility: null, content: null })

    expect(result).toEqual({
      success: false,
      errors: {
        title: 'Enter a title.',
        kind: 'Choose Read-aloud or Text.',
        visibility: 'Choose who can see this Handout.',
        content: 'Enter the Handout text.',
      },
    })
  })
})

describe('firstInvalidField', () => {
  it('names the first field in the order title, kind, visibility, content', () => {
    expect(firstInvalidField({ content: 'x', visibility: 'x', kind: 'x', title: 'x' })).toBe('title')
    expect(firstInvalidField({ content: 'x', visibility: 'x', kind: 'x' })).toBe('kind')
    expect(firstInvalidField({ content: 'x', visibility: 'x' })).toBe('visibility')
    expect(firstInvalidField({ content: 'x' })).toBe('content')
    expect(firstInvalidField({})).toBeNull()
  })
})
