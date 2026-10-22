import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { HandoutFormValues } from '@/scenario-preparation/services/handoutForm'
import type { RichTextDocument } from '@/shared/types/RichText'

import { HandoutForm } from './handout-form'

// specs/scenario-preparation/ux.md section 43; SP-UX-66, SP-UX-67, SP-UX-69, SP-UX-75, SP-A11Y-39, SP-A11Y-40.

const emptyValues: HandoutFormValues = { title: '', kind: null, visibility: null, content: null }
const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const content: RichTextDocument = { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [text('You stand before it.')] }] } }
const prefilled: HandoutFormValues = { title: 'The front door', kind: 'Text', visibility: 'KeeperFacing', content }

const baseProps = {
  initialValues: emptyValues,
  submitLabel: 'Add Handout',
  busyLabel: 'Adding...',
  pending: false,
  cancel: <a href="/campaigns/c1/scenarios/s1/scenes/a1">Cancel</a>,
}

interface EditableElement extends HTMLElement {
  __lexicalEditor?: LexicalEditor
}

const textBox = () => screen.getByRole('textbox', { name: 'Text' }) as EditableElement

// The rich-text toolbar has buttons of its own, so the submit button is the one of type submit.
const submitButton = (name: string) => screen.getAllByRole('button', { name }).find((button) => button.getAttribute('type') === 'submit')!

async function typeText(value: string) {
  const editor = textBox().__lexicalEditor as LexicalEditor
  await act(async () => {
    editor.update(() => {
      $getRoot().clear().append($createParagraphNode().append($createTextNode(value)))
    })
  })
}

describe('HandoutForm', () => {
  it('shows Title, Kind, Who can see it, and Text in that order, with no maximum length on the title (SP-A11Y-39)', () => {
    render(<HandoutForm {...baseProps} onSubmit={vi.fn()} />)

    const title = screen.getByLabelText('Title')
    const kind = screen.getByRole('group', { name: 'Kind' })
    const visibility = screen.getByRole('group', { name: 'Who can see it' })
    expect(title.compareDocumentPosition(kind) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(kind.compareDocumentPosition(visibility) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(visibility.compareDocumentPosition(textBox()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(title).not.toHaveAttribute('maxlength')
    expect(textBox()).toHaveAccessibleDescription('You can format text and add links.')
  })

  it('preselects neither a kind nor a visibility on an empty form (SP-UX-67)', () => {
    render(<HandoutForm {...baseProps} onSubmit={vi.fn()} />)

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
  })

  it('names each radio by its label and describes it by its sentence (SP-A11Y-39)', () => {
    render(<HandoutForm {...baseProps} onSubmit={vi.fn()} />)

    expect(screen.getByRole('radiogroup', { name: 'Kind' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Who can see it' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Read-aloud' })).toHaveAccessibleDescription('Text you read to the Players. It is shown as read-aloud text.')
    expect(screen.getByRole('radio', { name: 'Text' })).toHaveAccessibleDescription('Any other text, such as a letter or a newspaper clipping.')
    expect(screen.getByRole('radio', { name: 'Player-facing' })).toHaveAccessibleDescription('Players can receive it when you reveal it.')
    expect(screen.getByRole('radio', { name: 'Keeper-facing' })).toHaveAccessibleDescription('Only you can read it. It is never revealed.')
  })

  it('submits the trimmed title, the chosen kind and visibility, and the text (SP-UX-65)', async () => {
    const onSubmit = vi.fn()
    render(<HandoutForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Title'), '  The front door ')
    await userEvent.click(screen.getByRole('radio', { name: 'Read-aloud' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Player-facing' }))
    await typeText('You stand before it.')
    await userEvent.click(submitButton('Add Handout'))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const submitted = onSubmit.mock.calls[0][0]
    expect([submitted.title, submitted.kind, submitted.visibility]).toEqual(['The front door', 'ReadAloud', 'PlayerFacing'])
    expect(JSON.stringify(submitted.content)).toContain('You stand before it.')
  })

  it('shows every missing-field message inline in field order and focuses the title first (SP-UX-66, SP-A11Y-40)', async () => {
    const onSubmit = vi.fn()
    render(<HandoutForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.click(submitButton('Add Handout'))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Enter a title.')
    expect(screen.getByLabelText('Title')).toBeInvalid()
    expect(screen.getByRole('group', { name: 'Kind' })).toHaveAccessibleDescription('Choose Read-aloud or Text.')
    expect(screen.getByRole('group', { name: 'Who can see it' })).toHaveAccessibleDescription('Choose who can see this Handout.')
    expect(textBox()).toHaveAccessibleDescription('You can format text and add links. Enter the Handout text.')
    expect(textBox()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('focuses the first radio of Kind when only the kind, the visibility, and the text are missing', async () => {
    render(<HandoutForm {...baseProps} initialValues={{ ...emptyValues, title: 'The front door' }} onSubmit={vi.fn()} />)

    await userEvent.click(submitButton('Add Handout'))

    expect(screen.getByRole('radio', { name: 'Read-aloud' })).toHaveFocus()
  })

  it('focuses the first radio of Who can see it, then the text, as earlier fields become valid', async () => {
    render(<HandoutForm {...baseProps} initialValues={{ ...emptyValues, title: 'The front door', kind: 'Text' }} onSubmit={vi.fn()} />)

    await userEvent.click(submitButton('Add Handout'))
    expect(screen.getByRole('radio', { name: 'Player-facing' })).toHaveFocus()

    await userEvent.click(screen.getByRole('radio', { name: 'Keeper-facing' }))
    await userEvent.click(submitButton('Add Handout'))
    expect(textBox()).toHaveFocus()
  })

  it('asks for a shorter title when it is over 200 characters (SP-UX-66)', async () => {
    render(<HandoutForm {...baseProps} initialValues={{ ...prefilled, title: 'x'.repeat(201) }} onSubmit={vi.fn()} />)

    await userEvent.click(submitButton('Add Handout'))

    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Title must be 200 characters or fewer.')
  })

  it('shows the server message at its field and focuses the first refused field (ADR 0018)', () => {
    render(
      <HandoutForm
        {...baseProps}
        initialValues={prefilled}
        serverErrors={{ content: "This text can't be saved. Shorten it or remove unsupported content." }}
        onSubmit={vi.fn()}
      />,
    )

    expect(textBox()).toHaveAccessibleDescription("You can format text and add links. This text can't be saved. Shorten it or remove unsupported content.")
    expect(textBox()).toHaveFocus()
  })

  it('starts prefilled when editing, lets the kind change, and keeps the other values (SP-UX-69)', async () => {
    const onSubmit = vi.fn()
    render(<HandoutForm {...baseProps} initialValues={prefilled} submitLabel="Save" busyLabel="Saving..." onSubmit={onSubmit} />)

    expect(screen.getByLabelText('Title')).toHaveValue('The front door')
    expect(screen.getByRole('radio', { name: 'Text' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Keeper-facing' })).toBeChecked()
    expect(screen.getByText('You stand before it.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Read-aloud' }))
    await userEvent.click(submitButton('Save'))

    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'The front door', kind: 'ReadAloud', visibility: 'KeeperFacing', content })
  })

  it('moves focus to the title when asked to, as on Edit (SP-A11Y-40)', () => {
    render(<HandoutForm {...baseProps} initialValues={prefilled} autoFocusTitle onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('disables the submit button and shows the busy label while saving (SP-UX-75)', () => {
    render(<HandoutForm {...baseProps} pending onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled()
  })

  it('alerts when the last save failed and keeps what was typed', () => {
    render(<HandoutForm {...baseProps} initialValues={prefilled} failureMessage="We couldn't add the Handout. Try again." onSubmit={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't add the Handout. Try again.")
    expect(screen.getByLabelText('Title')).toHaveValue('The front door')
  })

  it('warns before leaving the page only once something was changed (SP-UX-69)', async () => {
    render(<HandoutForm {...baseProps} initialValues={prefilled} onSubmit={vi.fn()} />)
    const leaving = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(leaving()).toBe(false)

    await userEvent.type(screen.getByLabelText('Title'), '!')

    expect(leaving()).toBe(true)
  })
})
