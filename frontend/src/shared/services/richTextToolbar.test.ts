import { $createLinkNode } from '@lexical/link'
import { $createListItemNode, $createListNode } from '@lexical/list'
import { $createHeadingNode } from '@lexical/rich-text'
import {
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getRoot,
  type LexicalEditor,
  type TextNode,
} from 'lexical'
import { describe, expect, it } from 'vitest'

import {
  $readSelectedLinkUrl,
  $readToolbarState,
  applyLink,
  applyToolbarAction,
  type ToolbarAction,
  type ToolbarState,
} from '@/shared/services/richTextToolbar'
import { createTestEditor, serialize } from '@/shared/test-support/richTextEditor'

// specs/scenario-preparation/ux.md section 15; SP-UX-18, SP-UX-19, SP-A11Y-13; ADR 0015 amendment (editor normalization).
function paragraphWith(editor: LexicalEditor, value: string): void {
  editor.update(
    () => {
      const text = $createTextNode(value)
      $getRoot().clear().append($createParagraphNode().append(text))
      text.select(0, value.length)
    },
    { discrete: true },
  )
}

const stateOf = (editor: LexicalEditor): ToolbarState => editor.getEditorState().read($readToolbarState)

function apply(editor: LexicalEditor, action: ToolbarAction): void {
  applyToolbarAction(editor, action, stateOf(editor))
  editor.update(() => undefined, { discrete: true })
}

const topLevelTypes = (editor: LexicalEditor): string[] =>
  serialize(editor).root.children.map((child) => (child as { type: string }).type)

describe('applyToolbarAction text formats', () => {
  it.each([
    ['bold', 1],
    ['italic', 2],
    ['strikethrough', 4],
    ['underline', 8],
  ] as const)('%s sets its format bit on the selected text and shows pressed', (action, bit) => {
    const editor = createTestEditor()
    paragraphWith(editor, 'Cellar')

    apply(editor, action)

    const paragraph = serialize(editor).root.children[0] as { children: Array<{ format: number }> }
    expect(paragraph.children[0].format).toBe(bit)
    expect(stateOf(editor)[action]).toBe(true)
  })
})

describe('applyToolbarAction blocks', () => {
  it.each([
    ['heading', 'heading', 'h3'],
    ['subheading', 'heading', 'h4'],
  ] as const)('%s turns the block into a %s with the right tag', (action, type, tag) => {
    const editor = createTestEditor()
    paragraphWith(editor, 'Cellar')

    apply(editor, action)

    expect(serialize(editor).root.children[0]).toMatchObject({ type, tag })
    expect(stateOf(editor)[action]).toBe(true)
  })

  it('turns the block into a quote', () => {
    const editor = createTestEditor()
    paragraphWith(editor, 'Cellar')

    apply(editor, 'quote')

    expect(topLevelTypes(editor)).toEqual(['quote'])
    expect(stateOf(editor).quote).toBe(true)
  })

  it.each(['heading', 'subheading', 'quote'] as const)('returns an active %s block to a paragraph', (action) => {
    const editor = createTestEditor()
    paragraphWith(editor, 'Cellar')
    apply(editor, action)

    apply(editor, action)

    expect(topLevelTypes(editor)).toEqual(['paragraph'])
    expect(stateOf(editor)[action]).toBe(false)
  })

  it.each([
    ['bulleted-list', 'bullet'],
    ['numbered-list', 'number'],
  ] as const)('%s makes a %s list and toggles back to a paragraph', (action, listType) => {
    const editor = createTestEditor()
    paragraphWith(editor, 'Cellar')

    apply(editor, action)
    expect(serialize(editor).root.children[0]).toMatchObject({ type: 'list', listType })
    expect(stateOf(editor)[action]).toBe(true)

    apply(editor, action)
    expect(topLevelTypes(editor)).toEqual(['paragraph'])
  })

  it('leaves the list before making a heading, so no heading sits inside a list item', () => {
    const editor = createTestEditor()
    paragraphWith(editor, 'Cellar')
    apply(editor, 'bulleted-list')

    apply(editor, 'heading')

    expect(topLevelTypes(editor)).toEqual(['heading'])
  })
})

describe('applyLink', () => {
  const linkAttributes = { target: '_blank', rel: 'noopener noreferrer' }

  it('wraps the selected text in a link that opens in a new tab, safely', () => {
    const editor = createTestEditor()
    paragraphWith(editor, 'Cellar')

    applyLink(editor, 'https://example.com/a')
    editor.update(() => undefined, { discrete: true })

    const link = (serialize(editor).root.children[0] as { children: unknown[] }).children[0]
    expect(link).toMatchObject({ type: 'link', url: 'https://example.com/a', ...linkAttributes })
    expect(stateOf(editor).link).toBe(true)
  })

  it('inserts the address as the link text when nothing is selected', () => {
    const editor = createTestEditor()
    editor.update(
      () => {
        const text = $createTextNode('')
        $getRoot().clear().append($createParagraphNode().append(text))
        text.select(0, 0)
      },
      { discrete: true },
    )

    applyLink(editor, 'https://example.com')
    editor.update(() => undefined, { discrete: true })

    const link = (serialize(editor).root.children[0] as { children: Array<{ children: Array<{ text: string }> }> }).children[0]
    expect(link.children[0].text).toBe('https://example.com')
  })

  it('changes and removes the link at the selection', () => {
    const editor = createTestEditor()
    paragraphWith(editor, 'Cellar')
    applyLink(editor, 'https://example.com/a')
    editor.update(() => undefined, { discrete: true })
    expect(editor.getEditorState().read($readSelectedLinkUrl)).toBe('https://example.com/a')

    applyLink(editor, 'https://example.com/b')
    editor.update(() => undefined, { discrete: true })
    expect(editor.getEditorState().read($readSelectedLinkUrl)).toBe('https://example.com/b')

    applyLink(editor, null)
    editor.update(() => undefined, { discrete: true })
    expect(editor.getEditorState().read($readSelectedLinkUrl)).toBeNull()
    expect(serialize(editor).root.children[0]).toMatchObject({ children: [{ type: 'text' }] })
  })
})

describe('normalization', () => {
  function build(editor: LexicalEditor, create: () => void): void {
    editor.update(create, { discrete: true })
  }

  it.each([
    ['h1', 'h3'],
    ['h2', 'h3'],
    ['h5', 'h4'],
    ['h6', 'h4'],
  ] as const)('maps a pasted %s heading to %s', (from, to) => {
    const editor = createTestEditor()

    build(editor, () => $getRoot().clear().append($createHeadingNode(from).append($createTextNode('x'))))

    expect(serialize(editor).root.children[0]).toMatchObject({ type: 'heading', tag: to })
  })

  it('keeps h3 and h4 as they are', () => {
    const editor = createTestEditor()

    build(editor, () =>
      $getRoot().clear().append($createHeadingNode('h3').append($createTextNode('x')), $createHeadingNode('h4').append($createTextNode('y'))),
    )

    expect(serialize(editor).root.children.map((child) => (child as { tag: string }).tag)).toEqual(['h3', 'h4'])
  })

  it('clears code, subscript, superscript, and highlight formats but keeps the allowed ones', () => {
    const editor = createTestEditor()
    let text: TextNode | undefined

    build(editor, () => {
      text = $createTextNode('x').setFormat(1 | 16 | 32 | 64 | 128)
      $getRoot().clear().append($createParagraphNode().append(text))
    })

    const paragraph = serialize(editor).root.children[0] as { children: Array<{ format: number }> }
    expect(paragraph.children[0].format).toBe(1)
  })

  it('clears an inline style', () => {
    const editor = createTestEditor()

    build(editor, () => $getRoot().clear().append($createParagraphNode().append($createTextNode('x').setStyle('color: red'))))

    const paragraph = serialize(editor).root.children[0] as { children: Array<{ style: string }> }
    expect(paragraph.children[0].style).toBe('')
  })

  it('sets target and rel on a link', () => {
    const editor = createTestEditor()

    build(editor, () =>
      $getRoot().clear().append($createParagraphNode().append($createLinkNode('https://example.com').append($createTextNode('x')))),
    )

    const paragraph = serialize(editor).root.children[0] as { children: unknown[] }
    expect(paragraph.children[0]).toMatchObject({ type: 'link', target: '_blank', rel: 'noopener noreferrer' })
  })

  it.each(['javascript:alert(1)', 'mailto:a@example.com', '/relative'])('unwraps a link to %s and keeps its text', (url) => {
    const editor = createTestEditor()

    build(editor, () =>
      $getRoot().clear().append($createParagraphNode().append($createLinkNode(url).append($createTextNode('kept')))),
    )

    const paragraph = serialize(editor).root.children[0] as { children: Array<{ type: string; text: string }> }
    expect(paragraph.children).toMatchObject([{ type: 'text', text: 'kept' }])
  })

  it('turns a check list into a bulleted list without checked state', () => {
    const editor = createTestEditor()

    build(editor, () =>
      $getRoot()
        .clear()
        .append($createListNode('check').append($createListItemNode(true).append($createTextNode('x')))),
    )

    const list = serialize(editor).root.children[0] as { listType: string; children: Array<{ checked?: boolean }> }
    expect(list.listType).toBe('bullet')
    expect(list.children[0].checked).toBeUndefined()
  })

  it('turns a tab into spaces', () => {
    const editor = createTestEditor()

    build(editor, () => $getRoot().clear().append($createParagraphNode().append($createTabNode())))

    const paragraph = serialize(editor).root.children[0] as { children: Array<{ type: string; text: string }> }
    expect(paragraph.children[0]).toMatchObject({ type: 'text', text: '    ' })
  })
})
