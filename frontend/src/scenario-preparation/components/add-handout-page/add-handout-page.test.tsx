import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HandoutNotFoundError, HandoutValidationError } from '@/scenario-preparation/services/handoutApi'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { sceneContext, sceneOwner } from '@/scenario-preparation/test-support/handoutOwnerFixtures'
import type { HandoutOwnerContext } from '@/scenario-preparation/types/HandoutOwnerContext'
import { navigateSpy } from '@/shared/test-support/routerMock'

import { AddHandoutPage } from './add-handout-page'

// specs/scenario-preparation/ux.md sections 43 and 65; SP-UX-65 to SP-UX-67, SP-UX-72, SP-UX-73, SP-UX-75, SP-UX-100, SP-A11Y-40.
// The page takes its owner and what the owner allows as a context; the Scene gating is in scene-handout-route.

const { mockUseCreate, mutate } = vi.hoisted(() => ({
  mockUseCreate: vi.fn(),
  mutate: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useCreateHandout: mockUseCreate }))

interface EditableElement extends HTMLElement {
  __lexicalEditor?: LexicalEditor
}

const creating = (overrides: Record<string, unknown> = {}) => ({ mutate, isPending: false, isError: false, error: null, ...overrides })
const renderPage = (context: HandoutOwnerContext = sceneContext('Prepared')) =>
  render(<AddHandoutPage owner={sceneOwner} context={context} ownerNotFound={<h1>The Scene was not found</h1>} />)
const submitButton = () => screen.getAllByRole('button', { name: 'Add Handout' }).find((button) => button.getAttribute('type') === 'submit')!

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('Title'), 'The front door')
  await userEvent.click(screen.getByRole('radio', { name: 'Read-aloud' }))
  await userEvent.click(screen.getByRole('radio', { name: 'Player-facing' }))
  const editor = (screen.getByRole('textbox', { name: 'Text' }) as EditableElement).__lexicalEditor as LexicalEditor
  await act(async () => {
    editor.update(() => {
      $getRoot().clear().append($createParagraphNode().append($createTextNode('You stand before it.')))
    })
  })
  await userEvent.click(submitButton())
}

describe('AddHandoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCreate.mockReturnValue(creating())
  })

  it('shows one h1, the Scene it belongs to, the empty form, and a Cancel link back to the Scene (SP-UX-67, SP-A11Y-37)', () => {
    renderPage()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Add Handout' })).toBeInTheDocument()
    expect(screen.getByText('Scene: The Corbitt House')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('')
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked()
    }
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
  })

  it('adds the Handout and opens the Scene with "{title} added." and focus on that Handout (SP-UX-65, SP-A11Y-40)', async () => {
    mutate.mockImplementation((_input, options) => options.onSuccess({ id: 'h9', title: 'The front door' }))
    renderPage()

    await fillAndSubmit()

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'The front door', kind: 'ReadAloud', visibility: 'PlayerFacing' }),
      expect.any(Object),
    )
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
      params: { campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' },
      state: { statusMessage: 'The front door added.', focusHandoutId: 'h9' },
    })
  })

  it('shows the server message at its field once a text kind is chosen (SP-UX-66)', async () => {
    mockUseCreate.mockReturnValue(
      creating({
        isError: true,
        error: new HandoutValidationError({ content: "This text can't be saved. Shorten it or remove unsupported content." }),
      }),
    )

    renderPage()
    await userEvent.click(screen.getByRole('radio', { name: 'Text' }))

    expect(screen.getByRole('textbox', { name: 'Text' })).toHaveAccessibleDescription(
      "You can format text and add links. This text can't be saved. Shorten it or remove unsupported content.",
    )
  })

  it('alerts on a failure and keeps the form', () => {
    mockUseCreate.mockReturnValue(creating({ isError: true, error: new Error('boom') }))

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't add the Handout. Try again.")
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })

  it('keeps the form with the Finished conflict when the Scene was finished meanwhile (SP-UX-73)', () => {
    mockUseCreate.mockReturnValue(creating({ isError: true, error: new SceneFinishedError() }))

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent(
      "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel.",
    )
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })

  it('shows the busy label and a disabled button while adding (SP-UX-75)', () => {
    mockUseCreate.mockReturnValue(creating({ isPending: true }))

    renderPage()

    expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled()
  })

  it('offers the form on an Active Scene (SP-UX-72)', () => {
    renderPage(sceneContext('Active'))

    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })

  it('says a Finished Scene can not be changed and offers only the way back instead of the form (SP-UX-73)', () => {
    renderPage(sceneContext('Finished'))

    expect(screen.getByRole('heading', { level: 1, name: 'Add Handout' })).toBeInTheDocument()
    expect(screen.getByText("This Scene is finished and can't be changed.")).toBeInTheDocument()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the Scene' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
  })

  it('shows the not-found page of the owner when a save answers 404', () => {
    mockUseCreate.mockReturnValue(creating({ isError: true, error: new HandoutNotFoundError() }))

    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'The Scene was not found' })).toBeInTheDocument()
  })
})
