import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { ItemFormValues, ItemInput } from '@/scenario-preparation/types/Item'
import { RICH_TEXT_MAX_BYTES } from '@/shared/services/richText'
import type { RichTextDocument } from '@/shared/types/RichText'

import { ItemForm } from './item-form'

// specs/scenario-preparation/ux.md sections 62 and 66; SP-UX-92, SP-UX-94, SP-A11Y-55.
const empty: ItemFormValues = { name: '', playerFacingDescription: null, keeperNotes: null }
const baseProps = {
  initialValues: empty,
  submitLabel: 'Create',
  busyLabel: 'Creating...',
  pending: false,
  cancel: <a href="/campaigns/c1/items">Cancel</a>,
}

const paragraph = (value: string): RichTextDocument => ({
  root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' }] }] },
})

interface EditableElement extends HTMLElement {
  __lexicalEditor?: LexicalEditor
}

const nameBox = () => screen.getByLabelText('Name')
const descriptionBox = () => screen.getByRole('textbox', { name: 'Player-facing description' }) as EditableElement
const notesBox = () => screen.getByRole('textbox', { name: 'Keeper notes (optional)' }) as EditableElement

async function write(box: EditableElement, value: string) {
  const editor = box.__lexicalEditor as LexicalEditor
  await act(async () => {
    editor.update(() => {
      $getRoot().clear().append($createParagraphNode().append($createTextNode(value)))
    })
  })
}

describe('ItemForm', () => {
  it('labels the fields, marks Keeper notes optional, and connects their hints (SP-A11Y-55)', () => {
    render(<ItemForm {...baseProps} onSubmit={vi.fn()} />)

    expect(nameBox()).toHaveAccessibleDescription('Players see the name when you reveal or give this Item.')
    expect(descriptionBox()).toHaveAccessibleDescription(
      'What the Investigators may learn about it. Players see it only when you reveal or give the Item. You can format text and add links.',
    )
    expect(notesBox()).toHaveAccessibleDescription('Only you can read these. You can format text and add links.')
  })

  it('sets no maxLength so an over-long paste stays visible and is explained (SP-UX-92)', () => {
    render(<ItemForm {...baseProps} onSubmit={vi.fn()} />)

    expect(nameBox()).not.toHaveAttribute('maxlength')
  })

  it('shows the prefilled values', () => {
    render(
      <ItemForm {...baseProps} initialValues={{ name: "Walter Corbitt's diary", playerFacingDescription: paragraph('A leather diary'), keeperNotes: null }} onSubmit={vi.fn()} />,
    )

    expect(nameBox()).toHaveValue("Walter Corbitt's diary")
    expect(descriptionBox()).toHaveTextContent('A leather diary')
  })

  it('submits the trimmed name, the description, and the notes (SP-UX-92)', async () => {
    const onSubmit = vi.fn()
    render(<ItemForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.type(nameBox(), '  The cellar key ')
    await write(descriptionBox(), 'A rusty key')
    await write(notesBox(), 'Opens the cellar door')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    const submitted = onSubmit.mock.calls[0][0] as ItemInput
    expect(submitted.name).toBe('The cellar key')
    expect(JSON.stringify(submitted.playerFacingDescription)).toContain('A rusty key')
    expect(JSON.stringify(submitted.keeperNotes)).toContain('Opens the cellar door')
  })

  it('submits without notes when the editor was never used (SP-UX-92)', async () => {
    const onSubmit = vi.fn()
    render(<ItemForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.type(nameBox(), 'The cellar key')
    await write(descriptionBox(), 'A rusty key')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect((onSubmit.mock.calls[0][0] as ItemInput).keeperNotes).toBeNull()
  })

  it('explains every missing field at it, in field order, and focuses the first (SP-UX-92, SP-A11Y-55)', async () => {
    const onSubmit = vi.fn()
    render(<ItemForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(nameBox()).toHaveAttribute('aria-invalid', 'true')
    expect(nameBox()).toHaveAccessibleDescription('Players see the name when you reveal or give this Item. Enter a name.')
    expect(descriptionBox()).toHaveAttribute('aria-invalid', 'true')
    expect(descriptionBox()).toHaveAccessibleDescription(
      'What the Investigators may learn about it. Players see it only when you reveal or give the Item. You can format text and add links. Enter a Player-facing description.',
    )
    expect(nameBox()).toHaveFocus()
  })

  it('focuses the description when only it is missing (SP-UX-92)', async () => {
    render(<ItemForm {...baseProps} onSubmit={vi.fn()} />)

    await userEvent.type(nameBox(), 'The cellar key')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(descriptionBox()).toHaveFocus()
    expect(nameBox()).not.toHaveAttribute('aria-invalid')
  })

  it('says a name over 200 characters is too long and a description with no visible text is missing (SP-UX-92)', async () => {
    render(<ItemForm {...baseProps} onSubmit={vi.fn()} />)

    await userEvent.type(nameBox(), 'n'.repeat(201))
    await write(descriptionBox(), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByText('Name must be 200 characters or fewer.')).toBeInTheDocument()
    expect(screen.getByText('Enter a Player-facing description.')).toBeInTheDocument()
  })

  it('says the Keeper notes are too long when they pass the size the server accepts (SP-UX-92)', async () => {
    render(<ItemForm {...baseProps} onSubmit={vi.fn()} />)

    await userEvent.type(nameBox(), 'The cellar key')
    await write(descriptionBox(), 'A rusty key')
    await write(notesBox(), 'n'.repeat(RICH_TEXT_MAX_BYTES))
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(screen.getByText('Keeper notes are too long. Shorten them and try again.')).toBeInTheDocument()
    expect(notesBox()).toHaveFocus()
  })

  it('shows the messages the server returned at their fields and focuses the first (SP-UX-94, SP-A11Y-55)', () => {
    render(
      <ItemForm
        {...baseProps}
        initialValues={{ name: 'x', playerFacingDescription: paragraph('A key'), keeperNotes: null }}
        serverErrors={{ name: 'Name must be 200 characters or fewer.', keeperNotes: 'The Keeper notes must use only the allowed rich-text nodes.' }}
        onSubmit={vi.fn()}
      />,
    )

    expect(nameBox()).toHaveAccessibleDescription('Players see the name when you reveal or give this Item. Name must be 200 characters or fewer.')
    expect(notesBox()).toHaveAttribute('aria-invalid', 'true')
    expect(nameBox()).toHaveFocus()
  })

  it('alerts when the save failed and keeps the typed values', () => {
    render(
      <ItemForm
        {...baseProps}
        initialValues={{ name: 'The cellar key', playerFacingDescription: paragraph('A key'), keeperNotes: null }}
        failureMessage="We couldn't create the Item. Try again."
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't create the Item. Try again.")
    expect(nameBox()).toHaveValue('The cellar key')
  })

  it('shows the busy label and disables the button while saving (SP-UX-92)', () => {
    render(<ItemForm {...baseProps} pending onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
  })

  it('focuses the name when it appears on an Item page that is being edited (SP-UX-94)', () => {
    render(<ItemForm {...baseProps} autoFocusName submitLabel="Save" busyLabel="Saving..." onSubmit={vi.fn()} />)

    expect(nameBox()).toHaveFocus()
  })

  it('shows the cancel action next to the submit button', () => {
    render(<ItemForm {...baseProps} onSubmit={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/campaigns/c1/items')
  })
})
