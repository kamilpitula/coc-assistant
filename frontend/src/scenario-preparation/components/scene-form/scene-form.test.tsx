import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { SceneInput } from '@/scenario-preparation/types/Scene'

import { SceneForm } from './scene-form'

// specs/scenario-preparation/ux.md section 13; SP-UX-17, SP-A11Y-12, SP-A11Y-15.
const baseProps = {
  initialValues: { title: '', location: '', keeperNotes: null } satisfies SceneInput,
  submitLabel: 'Create Scene',
  busyLabel: 'Creating...',
  pending: false,
  cancel: <a href="/campaigns/c1/scenarios/s1">Cancel</a>,
}

interface EditableElement extends HTMLElement {
  __lexicalEditor?: LexicalEditor
}

const notesBox = () => screen.getByRole('textbox', { name: 'Keeper notes (optional)' }) as EditableElement

async function typeNotes(value: string, paragraphs = 1) {
  const editor = notesBox().__lexicalEditor as LexicalEditor
  await act(async () => {
    editor.update(() => {
      const root = $getRoot().clear()
      for (let index = 0; index < paragraphs; index++) {
        root.append($createParagraphNode().append($createTextNode(value)))
      }
    })
  })
}

describe('SceneForm', () => {
  it('labels the fields, marks Location and Keeper notes optional, and connects their hints', () => {
    render(<SceneForm {...baseProps} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Location (optional)')).toHaveAccessibleDescription(
      'Where the Scene takes place, for example Arkham, Boston Road.',
    )
    expect(notesBox()).toHaveAccessibleDescription('Only you can read these. You can format text and add links.')
    expect(notesBox()).toHaveAttribute('aria-multiline', 'true')
  })

  it('sets no maxLength so an over-long paste stays visible and is explained', () => {
    render(<SceneForm {...baseProps} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Title')).not.toHaveAttribute('maxlength')
    expect(screen.getByLabelText('Location (optional)')).not.toHaveAttribute('maxlength')
  })

  it('shows the prefilled values', () => {
    render(<SceneForm {...baseProps} initialValues={{ title: 'The Corbitt House', location: 'Arkham', keeperNotes: null }} onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Title')).toHaveValue('The Corbitt House')
    expect(screen.getByLabelText('Location (optional)')).toHaveValue('Arkham')
  })

  it('submits the trimmed title and location and the notes document', async () => {
    const onSubmit = vi.fn()
    render(<SceneForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Title'), '  The Corbitt House ')
    await userEvent.type(screen.getByLabelText('Location (optional)'), ' Arkham ')
    await typeNotes('Cellar key')
    await userEvent.click(screen.getByRole('button', { name: 'Create Scene' }))

    const submitted = onSubmit.mock.calls[0][0] as SceneInput
    expect([submitted.title, submitted.location]).toEqual(['The Corbitt House', 'Arkham'])
    expect(JSON.stringify(submitted.keeperNotes)).toContain('Cellar key')
  })

  it('submits no notes when the editor was never used or was emptied', async () => {
    const onSubmit = vi.fn()
    render(<SceneForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Title'), 'T')
    await userEvent.click(screen.getByRole('button', { name: 'Create Scene' }))

    expect(onSubmit).toHaveBeenCalledWith({ title: 'T', location: '', keeperNotes: null })
  })

  it('explains an empty title next to the field, marks it invalid, focuses it, and saves nothing (SP-UX-17)', async () => {
    const onSubmit = vi.fn()
    render(<SceneForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('button', { name: 'Create Scene' }))

    const title = screen.getByLabelText('Title')
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveAccessibleDescription('Enter a title.')
    expect(title).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('explains a title and location over 200 characters, focusing Title first', async () => {
    render(<SceneForm {...baseProps} onSubmit={vi.fn()} />)

    await userEvent.click(screen.getByLabelText('Title'))
    await userEvent.paste('a'.repeat(201))
    await userEvent.click(screen.getByLabelText('Location (optional)'))
    await userEvent.paste('b'.repeat(201))
    await userEvent.click(screen.getByRole('button', { name: 'Create Scene' }))

    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Title must be 200 characters or fewer.')
    expect(screen.getByLabelText('Location (optional)')).toHaveAccessibleDescription(
      'Where the Scene takes place, for example Arkham, Boston Road. Location must be 200 characters or fewer.',
    )
    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('explains notes over 204,800 bytes and focuses the editor when they are the first invalid field', async () => {
    const onSubmit = vi.fn()
    render(<SceneForm {...baseProps} initialValues={{ title: 'T', location: '', keeperNotes: null }} onSubmit={onSubmit} />)

    await typeNotes('a'.repeat(1000), 210)
    await userEvent.click(screen.getByRole('button', { name: 'Create Scene' }))

    expect(notesBox()).toHaveAttribute('aria-invalid', 'true')
    expect(notesBox()).toHaveAccessibleDescription(
      'Only you can read these. You can format text and add links. Keeper notes are too long. Shorten them and try again.',
    )
    expect(notesBox()).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the errors the server returned and focuses the first invalid field', () => {
    render(
      <SceneForm
        {...baseProps}
        initialValues={{ title: 'T', location: '', keeperNotes: null }}
        serverErrors={{ keeperNotes: "These Keeper notes can't be saved. Shorten them or remove unsupported content." }}
        onSubmit={vi.fn()}
      />,
    )

    expect(notesBox()).toHaveAccessibleDescription(/These Keeper notes can't be saved/)
    expect(notesBox()).toHaveFocus()
  })

  it('shows a failure message as an alert and keeps the typed values', async () => {
    render(<SceneForm {...baseProps} failureMessage="We couldn't create the Scene. Try again." onSubmit={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't create the Scene. Try again.")
  })

  it('shows the busy label and disables the button while pending (SP-UX-27)', () => {
    render(<SceneForm {...baseProps} pending onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
  })

  it('moves focus to the Title when asked to', () => {
    render(<SceneForm {...baseProps} autoFocusTitle onSubmit={vi.fn()} />)

    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('warns before leaving once the notes changed, not before', async () => {
    render(<SceneForm {...baseProps} onSubmit={vi.fn()} />)
    const untouched = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(untouched)
    expect(untouched.defaultPrevented).toBe(false)

    await typeNotes('x')

    const changed = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(changed)
    expect(changed.defaultPrevented).toBe(true)
  })
})
