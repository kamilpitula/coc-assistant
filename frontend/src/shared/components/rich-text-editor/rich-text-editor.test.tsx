import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { RichTextDocument } from '@/shared/types/RichText'

import { RichTextEditor } from './rich-text-editor'

// specs/scenario-preparation/ux.md section 15; SP-UX-18, SP-A11Y-12, SP-A11Y-13, SP-A11Y-14.
interface EditableElement extends HTMLElement {
  __lexicalEditor?: LexicalEditor
}

const NOTES: RichTextDocument = {
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [{ type: 'text', version: 1, text: 'Cellar key', format: 1, style: '', detail: 0, mode: 'normal' }],
      },
    ],
  },
}

function renderEditor(props: Partial<Parameters<typeof RichTextEditor>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <div>
      <span id="label">Keeper notes (optional)</span>
      <span id="hint">Only you can read these.</span>
      <span id="error">Too long.</span>
      <RichTextEditor id="notes" labelledBy="label" describedBy="hint" initialValue={null} onChange={onChange} {...props} />
      <button type="button">After</button>
    </div>,
  )
  return onChange
}

const editable = () => screen.getByRole('textbox', { name: 'Keeper notes (optional)' }) as EditableElement

describe('RichTextEditor', () => {
  it('is a multi-line textbox named by its label and described by its hint', () => {
    renderEditor()

    expect(editable()).toHaveAttribute('aria-multiline', 'true')
    expect(editable()).toHaveAccessibleDescription('Only you can read these.')
    expect(editable()).not.toHaveAttribute('aria-invalid')
  })

  it('is invalid and described by the hint and the error when told so', () => {
    renderEditor({ invalid: true, describedBy: 'hint error' })

    expect(editable()).toHaveAttribute('aria-invalid', 'true')
    expect(editable()).toHaveAccessibleDescription('Only you can read these. Too long.')
  })

  it('shows the initial document, formatted', () => {
    renderEditor({ initialValue: NOTES })

    expect(editable()).toHaveTextContent('Cellar key')
    expect(editable().querySelector('strong')).toHaveTextContent('Cellar key')
  })

  it('offers the formatting toolbar above the editable area', () => {
    renderEditor()

    expect(screen.getByRole('toolbar', { name: 'Formatting' })).toBeInTheDocument()
  })

  it('does not report a change on mount', () => {
    const onChange = renderEditor({ initialValue: NOTES })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('reports the document after a content change, and null once the content is empty', async () => {
    const onChange = renderEditor()
    const editor = editable().__lexicalEditor as LexicalEditor

    await act(async () => {
      editor.update(() => {
        $getRoot().clear().append($createParagraphNode().append($createTextNode('Cellar')))
      })
    })
    const typed = onChange.mock.calls.at(-1)?.[0] as RichTextDocument
    expect(JSON.stringify(typed)).toContain('Cellar')

    await act(async () => {
      editor.update(() => {
        $getRoot().clear().append($createParagraphNode())
      })
    })
    expect(onChange.mock.calls.at(-1)?.[0]).toBeNull()
  })

  it('lets Tab and Shift+Tab leave the editor (SP-A11Y-14)', async () => {
    renderEditor()
    await userEvent.click(editable())
    expect(editable()).toHaveFocus()

    await userEvent.tab()
    expect(editable()).not.toHaveFocus()
    expect(editable().ownerDocument.activeElement).toBe(screen.getByRole('button', { name: 'After' }))

    await userEvent.tab({ shift: true })
    expect(editable()).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(editable()).not.toHaveFocus()
  })

  it('opens the link dialog from the Link button, and refuses a non-http address', async () => {
    renderEditor()

    await userEvent.click(screen.getByRole('button', { name: 'Link' }))
    const field = await screen.findByRole('textbox', { name: 'Web address' })
    await userEvent.type(field, 'javascript:alert(1)')
    await userEvent.click(screen.getByRole('button', { name: 'Save link' }))

    expect(screen.getByText('Enter a web address that starts with http:// or https://.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Add link' })).toBeInTheDocument()
  })
})
