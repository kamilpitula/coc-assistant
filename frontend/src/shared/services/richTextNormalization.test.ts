import { describe, expect, it } from 'vitest'

import { createTestEditor, loadDocument, serialize } from '@/shared/test-support/richTextEditor'

// ADR 0015 amendment, "Editor normalization": whatever is pasted ends up inside the allowed nodes.
const text = (value: string, extra: Record<string, unknown> = {}) => ({
  type: 'text',
  version: 1,
  text: value,
  format: 0,
  style: '',
  detail: 0,
  mode: 'normal',
  ...extra,
})
const documentOf = (...children: unknown[]) => ({ root: { type: 'root', version: 1, children } })
const paragraph = (...children: unknown[]) => ({ type: 'paragraph', version: 1, children })
const heading = (tag: string) => ({ type: 'heading', version: 1, tag, children: [text('Title')] })
const link = (url: string, extra: Record<string, unknown> = {}) => ({
  type: 'link',
  version: 1,
  url,
  children: [text('here')],
  ...extra,
})

function normalized(...children: unknown[]) {
  const editor = createTestEditor()
  loadDocument(editor, documentOf(...children))
  return serialize(editor).root.children as Record<string, unknown>[]
}

describe('registerRichTextNormalization', () => {
  it.each([
    ['h1', 'h3'],
    ['h2', 'h3'],
    ['h3', 'h3'],
    ['h4', 'h4'],
    ['h5', 'h4'],
    ['h6', 'h4'],
  ])('maps a %s heading to %s', (from, to) => {
    expect(normalized(heading(from))[0].tag).toBe(to)
  })

  it('keeps bold, italic, strikethrough, and underline and clears code, subscript, superscript, and highlight', () => {
    const [block] = normalized(paragraph(text('a', { format: 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 })))

    expect((block.children as { format: number }[])[0].format).toBe(15)
  })

  it('clears an inline style', () => {
    const [block] = normalized(paragraph(text('a', { style: 'color: red' })))

    expect((block.children as { style: string }[])[0].style).toBe('')
  })

  it('gives a link a new-tab target and a safe rel', () => {
    const [block] = normalized(paragraph(link('https://example.com', { target: '_self', rel: 'external' })))

    expect((block.children as Record<string, unknown>[])[0]).toMatchObject({
      type: 'link',
      url: 'https://example.com',
      target: '_blank',
      rel: 'noopener noreferrer',
    })
  })

  it.each(['mailto:a@example.com', '/relative', 'data:text/html,x', 'javascript:alert(1)'])(
    'unwraps a link to %s and keeps its text',
    (url) => {
      const [block] = normalized(paragraph(link(url)))

      expect(block.children).toEqual([expect.objectContaining({ type: 'text', text: 'here' })])
    },
  )

  it('turns a check list into a bulleted list without checked items', () => {
    const [list] = normalized({
      type: 'list',
      version: 1,
      listType: 'check',
      start: 1,
      tag: 'ul',
      children: [{ type: 'listitem', version: 1, value: 1, checked: true, children: [text('done')] }],
    })

    expect(list.listType).toBe('bullet')
    expect((list.children as { checked?: boolean }[])[0].checked).toBeUndefined()
  })

  it('turns a tab into spaces', () => {
    const [block] = normalized(paragraph(text('a'), { type: 'tab', version: 1, text: '\t', format: 0, style: '', detail: 2, mode: 'normal' }))

    expect(JSON.stringify(block)).not.toContain('"tab"')
    expect(JSON.stringify(block)).toContain('    ')
  })
})
