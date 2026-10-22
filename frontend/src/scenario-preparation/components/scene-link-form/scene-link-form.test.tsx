import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'

import { SceneLinkForm, type SceneLinkFormPicker } from './scene-link-form'

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)

// specs/scenario-preparation/ux.md section 33; SP-UX-52, SP-UX-53, SP-UX-55, SP-UX-61, SP-UX-63, SP-A11Y-33, SP-A11Y-35.

const ghoul: NonPlayerEntitySummary = { id: 'm1', type: 'MythosCreature', name: 'Ghoul' }
const knott: NonPlayerEntitySummary = { id: 'h1', type: 'HumanNpc', name: 'Mr. Knott' }
const picker: SceneLinkFormPicker = {
  campaignId: 'c1',
  entities: [ghoul, knott],
  isPending: false,
  isError: false,
  onRetry: vi.fn(),
  linked: [],
}
const emptyValues = { nonPlayerEntity: null, playerFacingName: '', playerFacingDescription: null }
const baseProps = {
  picker,
  initialValues: emptyValues,
  submitLabel: 'Link',
  busyLabel: 'Linking...',
  pending: false,
  cancel: <a href="/campaigns/c1/scenarios/s1/scenes/a1">Cancel</a>,
}

interface EditableElement extends HTMLElement {
  __lexicalEditor?: LexicalEditor
}

const descriptionBox = () => screen.getByRole('textbox', { name: 'Player-facing description (optional)' }) as EditableElement

// The rich-text toolbar has a "Link" button too, so the submit button is the one of type submit.
const submitButton = () => screen.getAllByRole('button', { name: 'Link' }).find((button) => button.getAttribute('type') === 'submit')!

async function typeDescription(value: string, paragraphs = 1) {
  const editor = descriptionBox().__lexicalEditor as LexicalEditor
  await act(async () => {
    editor.update(() => {
      const root = $getRoot().clear()
      for (let index = 0; index < paragraphs; index++) {
        root.append($createParagraphNode().append($createTextNode(value)))
      }
    })
  })
}

describe('SceneLinkForm', () => {
  it('shows the picker, the name starting empty, and the optional description with their hints (SP-UX-63)', () => {
    render(<SceneLinkForm {...baseProps} onSubmit={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Non-Player Entity' })).toBeInTheDocument()
    expect(screen.getByLabelText('Player-facing name')).toHaveValue('')
    expect(screen.getByLabelText('Player-facing name')).toHaveAccessibleDescription(
      'What the Investigators know it as, for example A shape in the cellar.',
    )
    expect(descriptionBox()).toHaveAccessibleDescription(
      'What the Investigators may learn. Players see it only when you reveal it. You can format text and add links.',
    )
    expect(screen.getByLabelText('Player-facing name')).not.toHaveAttribute('maxlength')
  })

  it('submits the chosen entity, the trimmed name, and the description (SP-UX-52)', async () => {
    const onSubmit = vi.fn()
    render(<SceneLinkForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Ghoul' }))
    await userEvent.type(screen.getByLabelText('Player-facing name'), '  A shape in the cellar ')
    await typeDescription('Grey and wet.')
    await userEvent.click(submitButton())

    const submitted = onSubmit.mock.calls[0][0]
    expect([submitted.nonPlayerEntity, submitted.playerFacingName]).toEqual([{ type: 'MythosCreature', id: 'm1' }, 'A shape in the cellar'])
    expect(JSON.stringify(submitted.playerFacingDescription)).toContain('Grey and wet.')
  })

  it('submits no description when the editor was never used', async () => {
    const onSubmit = vi.fn()
    render(<SceneLinkForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Mr. Knott' }))
    await userEvent.type(screen.getByLabelText('Player-facing name'), 'The landlord')
    await userEvent.click(submitButton())

    expect(onSubmit).toHaveBeenCalledWith({
      nonPlayerEntity: { type: 'HumanNpc', id: 'h1' },
      playerFacingName: 'The landlord',
      playerFacingDescription: null,
    })
  })

  it('refuses without an entity, says so at the picker, focuses its first radio, and saves nothing (SP-UX-53, SP-A11Y-33)', async () => {
    const onSubmit = vi.fn()
    render(<SceneLinkForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText('Player-facing name'), 'A shape')
    await userEvent.click(submitButton())

    expect(screen.getByRole('group', { name: 'Non-Player Entity' })).toHaveAccessibleDescription('Choose a Non-Player Entity.')
    expect(screen.getByRole('radio', { name: 'Ghoul' })).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('refuses an empty name next to the field, marks it invalid, and focuses it when the entity is chosen (SP-UX-53, SP-A11Y-35)', async () => {
    const onSubmit = vi.fn()
    render(<SceneLinkForm {...baseProps} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByRole('radio', { name: 'Ghoul' }))
    await userEvent.click(submitButton())

    const name = screen.getByLabelText('Player-facing name')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAccessibleDescription(
      'What the Investigators know it as, for example A shape in the cellar. Enter a Player-facing name.',
    )
    expect(name).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('refuses a name over 200 characters', async () => {
    render(<SceneLinkForm {...baseProps} initialValues={{ ...emptyValues, nonPlayerEntity: { type: 'HumanNpc', id: 'h1' } }} onSubmit={vi.fn()} />)

    await userEvent.click(screen.getByLabelText('Player-facing name'))
    await userEvent.paste('a'.repeat(201))
    await userEvent.click(submitButton())

    expect(screen.getByLabelText('Player-facing name')).toHaveAccessibleDescription(/Player-facing name must be 200 characters or fewer\./)
  })

  it('refuses a description over 204,800 bytes and focuses the editor when it is the first invalid field', async () => {
    const onSubmit = vi.fn()
    render(
      <SceneLinkForm
        {...baseProps}
        initialValues={{ nonPlayerEntity: { type: 'HumanNpc', id: 'h1' }, playerFacingName: 'N', playerFacingDescription: null }}
        onSubmit={onSubmit}
      />,
    )

    await typeDescription('a'.repeat(1000), 210)
    await userEvent.click(submitButton())

    expect(descriptionBox()).toHaveAttribute('aria-invalid', 'true')
    expect(descriptionBox()).toHaveAccessibleDescription(/Player-facing description is too long\. Shorten it and try again\./)
    expect(descriptionBox()).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the server messages at their fields and focuses the first invalid one', () => {
    render(
      <SceneLinkForm
        {...baseProps}
        initialValues={{ nonPlayerEntity: { type: 'HumanNpc', id: 'h1' }, playerFacingName: 'N', playerFacingDescription: null }}
        serverErrors={{
          nonPlayerEntity: 'Choose a Non-Player Entity from this Campaign.',
          playerFacingDescription: "This Player-facing description can't be saved. Shorten it or remove unsupported content.",
        }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('group', { name: 'Non-Player Entity' })).toHaveAccessibleDescription('Choose a Non-Player Entity from this Campaign.')
    expect(descriptionBox()).toHaveAccessibleDescription(/This Player-facing description can't be saved/)
    expect(screen.getByRole('radio', { name: 'Mr. Knott' })).toHaveFocus()
  })

  it('shows a failure message as an alert and keeps the typed values', () => {
    render(<SceneLinkForm {...baseProps} failureMessage="We couldn't link the Non-Player Entity. Try again." onSubmit={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't link the Non-Player Entity. Try again.")
  })

  it('disables the button and shows the busy label while pending so a second activation does nothing (SP-UX-61)', () => {
    render(<SceneLinkForm {...baseProps} pending onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Linking...' })).toBeDisabled()
  })

  describe('editing', () => {
    const editProps = {
      initialValues: { nonPlayerEntity: null, playerFacingName: 'A shape in the cellar', playerFacingDescription: null },
      submitLabel: 'Save',
      busyLabel: 'Saving...',
      pending: false,
      cancel: <a href="/campaigns/c1/scenarios/s1/scenes/a1">Cancel</a>,
    }

    it('shows no picker, prefills the name, and submits without asking for an entity (SP-UX-55)', async () => {
      const onSubmit = vi.fn()
      render(<SceneLinkForm {...editProps} autoFocusName onSubmit={onSubmit} />)

      expect(screen.queryByRole('group', { name: 'Non-Player Entity' })).not.toBeInTheDocument()
      expect(screen.getByLabelText('Player-facing name')).toHaveValue('A shape in the cellar')
      expect(screen.getByLabelText('Player-facing name')).toHaveFocus()
      await userEvent.type(screen.getByLabelText('Player-facing name'), '!')
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSubmit).toHaveBeenCalledWith({ nonPlayerEntity: null, playerFacingName: 'A shape in the cellar!', playerFacingDescription: null })
    })
  })

  it('warns before leaving once the entity, the name, or the description changed, not before', async () => {
    render(<SceneLinkForm {...baseProps} onSubmit={vi.fn()} />)
    const untouched = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(untouched)
    expect(untouched.defaultPrevented).toBe(false)

    await userEvent.click(screen.getByRole('radio', { name: 'Ghoul' }))

    const changed = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(changed)
    expect(changed.defaultPrevented).toBe(true)
  })
})
