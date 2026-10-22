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
    expect(validateHandoutForm({ ...valid, kind: null })).toEqual({ success: false, errors: { kind: 'Choose a kind.' } })
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
    const result = validateHandoutForm({ title: '', kind: 'Text', visibility: null, content: null })

    expect(result).toEqual({
      success: false,
      errors: {
        title: 'Enter a title.',
        visibility: 'Choose who can see this Handout.',
        content: 'Enter the Handout text.',
      },
    })
  })

  it('gives only the kind error when no kind is chosen, because there is no content field yet (SP-UX-77)', () => {
    const result = validateHandoutForm({ title: 'Plan', kind: null, visibility: 'PlayerFacing', content: null, file: null })

    expect(result).toEqual({ success: false, errors: { kind: 'Choose a kind.' } })
  })
})

describe('validateHandoutForm for a file kind', () => {
  const png = new File(['x'], 'plan.png', { type: 'image/png' })
  const pdf = new File(['x'], 'letter.pdf', { type: 'application/pdf' })
  const validImage: HandoutFormValues = { title: ' Floor plan ', kind: 'Image', visibility: 'PlayerFacing', content: null, file: png }

  it('returns the file input with the trimmed title and no content', () => {
    expect(validateHandoutForm(validImage)).toEqual({
      success: true,
      data: { title: 'Floor plan', kind: 'Image', visibility: 'PlayerFacing', file: png },
    })
    expect(validateHandoutForm({ ...validImage, kind: 'Map' }).success).toBe(true)
    expect(validateHandoutForm({ ...validImage, kind: 'Document', file: pdf }).success).toBe(true)
  })

  it('ignores any rich text that was typed before switching to a file kind', () => {
    expect(validateHandoutForm({ ...validImage, content: document('draft') }).success).toBe(true)
  })

  it('asks for the file of the family when none is chosen', () => {
    expect(validateHandoutForm({ ...validImage, file: null })).toEqual({ success: false, errors: { file: 'Choose an image.' } })
    expect(validateHandoutForm({ ...validImage, kind: 'Document', file: null })).toEqual({ success: false, errors: { file: 'Choose a PDF.' } })
  })

  it('refuses a wrong type or an oversize file with the family message (SP-UX-79)', () => {
    expect(validateHandoutForm({ ...validImage, file: pdf }).success).toBe(false)
    expect(validateHandoutForm({ ...validImage, kind: 'Document', file: png })).toEqual({
      success: false,
      errors: { file: "This isn't a PDF. Choose a PDF." },
    })
    const huge = new File(['x'], 'big.png', { type: 'image/png' })
    Object.defineProperty(huge, 'size', { value: 20 * 1024 * 1024 + 1 })
    expect(validateHandoutForm({ ...validImage, file: huge })).toEqual({
      success: false,
      errors: { file: 'The image is larger than 20 MB. Choose a smaller one.' },
    })
  })

  it('lets an edit keep the stored file when none is chosen, but still checks a chosen one', () => {
    expect(validateHandoutForm({ ...validImage, file: null, hasStoredFile: true })).toEqual({
      success: true,
      data: { title: 'Floor plan', kind: 'Image', visibility: 'PlayerFacing', file: null },
    })
    expect(validateHandoutForm({ ...validImage, file: pdf, hasStoredFile: true }).success).toBe(false)
  })

  it('reports the title, visibility, and file errors in field order', () => {
    const result = validateHandoutForm({ title: '', kind: 'Image', visibility: null, content: null, file: null })

    expect(result).toEqual({
      success: false,
      errors: { title: 'Enter a title.', visibility: 'Choose who can see this Handout.', file: 'Choose an image.' },
    })
  })
})

describe('firstInvalidField', () => {
  it('names the first field in the order title, kind, visibility, content, file', () => {
    expect(firstInvalidField({ file: 'x', content: 'x', visibility: 'x', kind: 'x', title: 'x' })).toBe('title')
    expect(firstInvalidField({ content: 'x', visibility: 'x', kind: 'x' })).toBe('kind')
    expect(firstInvalidField({ content: 'x', visibility: 'x' })).toBe('visibility')
    expect(firstInvalidField({ content: 'x', file: 'x' })).toBe('content')
    expect(firstInvalidField({ file: 'x' })).toBe('file')
    expect(firstInvalidField({})).toBeNull()
  })
})
