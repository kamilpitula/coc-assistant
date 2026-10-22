import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    expect(title).not.toHaveAttribute('maxlength')
    expect(screen.getByText('Choose a kind to add its content.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Text' })).not.toBeInTheDocument()
  })

  it('shows the text field after Who can see it once a rich-text kind is chosen (SP-UX-77, SP-A11Y-45)', () => {
    render(<HandoutForm {...baseProps} initialValues={{ ...emptyValues, kind: 'Text' }} onSubmit={vi.fn()} />)

    const visibility = screen.getByRole('group', { name: 'Who can see it' })
    expect(visibility.compareDocumentPosition(textBox()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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
    expect(screen.getByRole('group', { name: 'Kind' })).toHaveAccessibleDescription('Choose a kind.')
    expect(screen.getByRole('group', { name: 'Who can see it' })).toHaveAccessibleDescription('Choose who can see this Handout.')
    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('shows the text error at the text field once a rich-text kind is chosen (SP-UX-66)', async () => {
    render(<HandoutForm {...baseProps} initialValues={{ ...emptyValues, title: 'T', kind: 'Text', visibility: 'KeeperFacing' }} onSubmit={vi.fn()} />)

    await userEvent.click(submitButton('Add Handout'))

    expect(textBox()).toHaveAccessibleDescription('You can format text and add links. Enter the Handout text.')
    expect(textBox()).toHaveAttribute('aria-invalid', 'true')
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

  describe('file kinds', () => {
    const png = new File(['png'], 'plan.png', { type: 'image/png' })
    const pdf = new File(['pdf'], 'letter.pdf', { type: 'application/pdf' })
    const fileInput = () => document.querySelector('input[type=file]') as HTMLInputElement
    const radioValues = () => screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))

    beforeEach(() => {
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:test/1', revokeObjectURL: vi.fn() }))
    })

    afterEach(() => vi.unstubAllGlobals())

    it('offers five kinds on the add page and shows the image field for a Map without moving focus (SP-UX-77)', async () => {
      render(<HandoutForm {...baseProps} onSubmit={vi.fn()} />)
      expect(radioValues().slice(0, 5)).toEqual(['ReadAloud', 'Text', 'Image', 'Document', 'Map'])

      await userEvent.click(screen.getByRole('radio', { name: 'Map' }))

      expect(fileInput()).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp,image/gif')
      expect(screen.getByText('PNG, JPEG, WebP, or GIF, up to 20 MB.')).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Map' })).toHaveFocus()
    })

    it('submits the chosen image with the kind and visibility (SP-UX-78)', async () => {
      const onSubmit = vi.fn()
      render(<HandoutForm {...baseProps} initialValues={{ ...emptyValues, title: ' Plan ', visibility: 'PlayerFacing' }} onSubmit={onSubmit} />)

      await userEvent.click(screen.getByRole('radio', { name: 'Image' }))
      await userEvent.upload(fileInput(), png)
      await userEvent.click(submitButton('Add Handout'))

      expect(onSubmit).toHaveBeenCalledWith({ kind: 'Image', visibility: 'PlayerFacing', title: 'Plan', file: png })
    })

    it('previews the chosen image and shows its name and size (SP-UX-77)', async () => {
      render(<HandoutForm {...baseProps} initialValues={{ ...emptyValues, kind: 'Image' }} onSubmit={vi.fn()} />)

      await userEvent.upload(fileInput(), png)

      expect(screen.getByRole('img', { name: 'Preview of plan.png' })).toBeInTheDocument()
      expect(screen.getByText('plan.png, 1 KB')).toBeInTheDocument()
    })

    it('refuses a missing or wrong-type file at the file field, focused, and sends nothing (SP-UX-79, SP-A11Y-44)', async () => {
      const onSubmit = vi.fn()
      render(<HandoutForm {...baseProps} initialValues={{ ...emptyValues, title: 'T', kind: 'Document', visibility: 'KeeperFacing' }} onSubmit={onSubmit} />)

      await userEvent.click(submitButton('Add Handout'))
      expect(fileInput()).toHaveAccessibleDescription('PDF, up to 20 MB. Choose a PDF.')
      expect(fileInput()).toBeInvalid()
      expect(fileInput()).toHaveFocus()

      await userEvent.upload(fileInput(), new File(['x'], 'a.png', { type: 'image/png' }), { applyAccept: false })
      await userEvent.click(submitButton('Add Handout'))
      expect(screen.getByText("This isn't a PDF. Choose a PDF.")).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('keeps the chosen image across kind switches (SP-UX-87)', async () => {
      render(<HandoutForm {...baseProps} onSubmit={vi.fn()} />)
      await userEvent.click(screen.getByRole('radio', { name: 'Image' }))
      await userEvent.upload(fileInput(), png)

      await userEvent.click(screen.getByRole('radio', { name: 'Text' }))
      expect(screen.queryByText('plan.png, 1 KB')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('radio', { name: 'Map' }))

      expect(screen.getByText('plan.png, 1 KB')).toBeInTheDocument()
    })

    it('shows the server message at the file field and focuses it', () => {
      render(
        <HandoutForm {...baseProps} initialValues={{ ...emptyValues, kind: 'Image' }} serverErrors={{ file: 'Choose a PNG, JPEG, WebP, or GIF image.' }} onSubmit={vi.fn()} />,
      )

      expect(fileInput()).toHaveAccessibleDescription('PNG, JPEG, WebP, or GIF, up to 20 MB. Choose a PNG, JPEG, WebP, or GIF image.')
      expect(fileInput()).toHaveFocus()
    })

    it('on an edit of an Image offers only Image and Map, shows the current image, and keeps it when none is chosen (SP-UX-84, SP-UX-86)', async () => {
      const onSubmit = vi.fn()
      const storedFile = { name: 'plan.png', mediaType: 'image/png', sizeBytes: 870_400 }
      render(
        <HandoutForm
          {...baseProps}
          initialValues={{ title: 'Plan', kind: 'Image', visibility: 'KeeperFacing', content: null, storedFile }}
          submitLabel="Save"
          onSubmit={onSubmit}
        />,
      )

      expect(radioValues().slice(0, 2)).toEqual(['Image', 'Map'])
      expect(screen.queryByRole('radio', { name: 'Document' })).not.toBeInTheDocument()
      expect(screen.getByText('Current image: plan.png, 850 KB')).toBeInTheDocument()
      expect(screen.getByLabelText('Replace image')).toHaveAccessibleDescription('Leave empty to keep the current image. PNG, JPEG, WebP, or GIF, up to 20 MB.')

      await userEvent.click(submitButton('Save'))

      expect(onSubmit).toHaveBeenCalledWith({ kind: 'Image', visibility: 'KeeperFacing', title: 'Plan', file: null })
    })

    it('on an edit of a Document shows no kind radios, only the fixed sentence (SP-UX-86, SP-A11Y-50)', () => {
      const storedFile = { name: 'letter.pdf', mediaType: 'application/pdf', sizeBytes: 2048 }
      render(<HandoutForm {...baseProps} initialValues={{ title: 'Letter', kind: 'Document', visibility: 'KeeperFacing', content: null, storedFile }} onSubmit={vi.fn()} />)

      expect(screen.getByRole('group', { name: 'Kind' })).toHaveTextContent('Document. A Document Handout stays a Document.')
      expect(screen.queryByRole('radio', { name: 'Image' })).not.toBeInTheDocument()
      expect(screen.getByLabelText('Replace document')).toBeInTheDocument()
      expect(screen.getByText('Current document: letter.pdf, 2 KB')).toBeInTheDocument()
    })

    it('replaces the stored file with a chosen one on an edit (SP-UX-85)', async () => {
      const onSubmit = vi.fn()
      const storedFile = { name: 'letter.pdf', mediaType: 'application/pdf', sizeBytes: 2048 }
      render(<HandoutForm {...baseProps} initialValues={{ title: 'Letter', kind: 'Document', visibility: 'KeeperFacing', content: null, storedFile }} onSubmit={onSubmit} />)

      await userEvent.upload(fileInput(), pdf)
      await userEvent.click(submitButton('Add Handout'))

      expect(onSubmit).toHaveBeenCalledWith({ kind: 'Document', visibility: 'KeeperFacing', title: 'Letter', file: pdf })
    })
  })
})
