import { describe, expect, it } from 'vitest'

import { isAllowedLinkUrl, isEmptyRichText, richTextByteLength } from '@/shared/services/richText'
import type { RichTextDocument } from '@/shared/types/RichText'

// specs/scenario-preparation/spec.md (Rich text); design record PBI-SP-002 D6; ADR 0015 amendment.
const documentOf = (...children: unknown[]): RichTextDocument => ({ root: { type: 'root', children } })
const paragraph = (...children: unknown[]) => ({ type: 'paragraph', children })
const text = (value: string) => ({ type: 'text', text: value })

describe('isEmptyRichText', () => {
  it('is empty for no document', () => {
    expect(isEmptyRichText(null)).toBe(true)
    expect(isEmptyRichText(undefined)).toBe(true)
  })

  it('is empty for the editor empty paragraph and for a document without children', () => {
    expect(isEmptyRichText(documentOf(paragraph()))).toBe(true)
    expect(isEmptyRichText(documentOf())).toBe(true)
  })

  it('is empty when the only text is whitespace or the only content is line breaks', () => {
    expect(isEmptyRichText(documentOf(paragraph(text('  \n')), paragraph({ type: 'linebreak' })))).toBe(true)
  })

  it('is not empty once any node holds visible text, however deep', () => {
    const nested = documentOf({ type: 'list', children: [{ type: 'listitem', children: [text('Cellar key')] }] })

    expect(isEmptyRichText(nested)).toBe(false)
    expect(isEmptyRichText(documentOf(paragraph(), paragraph(text('x'))))).toBe(false)
  })
})

describe('richTextByteLength', () => {
  it('counts the UTF-8 bytes of the JSON that is sent, so multi-byte characters count as bytes', () => {
    const ascii = documentOf(paragraph(text('abc')))
    const accented = documentOf(paragraph(text(String.fromCharCode(0xe9).repeat(3))))

    expect(richTextByteLength(ascii)).toBe(JSON.stringify(ascii).length)
    expect(richTextByteLength(accented)).toBe(JSON.stringify(accented).length + 3)
  })
})

describe('isAllowedLinkUrl', () => {
  it.each(['http://example.com', 'https://example.com/a?b=1#c', 'HTTPS://EXAMPLE.COM'])('accepts %s', (url) => {
    expect(isAllowedLinkUrl(url)).toBe(true)
  })

  it.each([
    '',
    'example.com',
    'javascript:alert(1)',
    'mailto:a@example.com',
    'data:text/html,x',
    '/relative',
    '//example.com',
    'ftp://example.com',
    'https://',
    'http:example.com',
  ])('refuses %s', (url) => {
    expect(isAllowedLinkUrl(url)).toBe(false)
  })
})
