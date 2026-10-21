import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NonPlayerEntityLinkNotFoundError, NonPlayerEntityLinkValidationError } from '@/scenario-preparation/services/nonPlayerEntityLinkApi'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { navigateSpy } from '@/shared/test-support/routerMock'
import type { RichTextDocument } from '@/shared/types/RichText'

import { EditNonPlayerEntityLinkPage } from './edit-non-player-entity-link-page'

// specs/scenario-preparation/ux.md section 33; SP-UX-53, SP-UX-55, SP-UX-57, SP-UX-60, SP-UX-61.

const { mockUseCampaign, mockUseScene, mockUseEdit, mutate } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseScene: vi.fn(),
  mockUseEdit: vi.fn(),
  mutate: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntityLinks', () => ({ useEditNonPlayerEntityLink: mockUseEdit }))

const description: RichTextDocument = {
  root: {
    type: 'root',
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'Grey and wet.', format: 0, style: '', detail: 0, mode: 'normal' }] }],
  },
}
const scene: Scene = {
  id: 'a1',
  title: 'The Corbitt House',
  location: '',
  keeperNotes: null,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [
    {
      id: 'l1',
      nonPlayerEntity: { id: 'm1', type: 'MythosCreature', name: 'Ghoul' },
      playerFacingName: 'A shape in the cellar',
      playerFacingDescription: description,
    },
  ],
}

const editing = (overrides: Record<string, unknown> = {}) => ({ mutate, isPending: false, isError: false, error: null, ...overrides })
const renderPage = (linkId = 'l1') => render(<EditNonPlayerEntityLinkPage campaignId="c1" scenarioId="s1" sceneId="a1" linkId={linkId} />)

describe('EditNonPlayerEntityLinkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseScene.mockReturnValue({ data: scene })
    mockUseEdit.mockReturnValue(editing())
  })

  it('shows Edit with the saved name, the Scene, and the entity as text, with the fields prefilled and no picker (SP-UX-55)', () => {
    renderPage()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Edit A shape in the cellar' })).toBeInTheDocument()
    expect(screen.getByText('Scene: The Corbitt House')).toBeInTheDocument()
    expect(screen.getByText('Mythos Creature: Ghoul')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Non-Player Entity' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Player-facing name')).toHaveValue('A shape in the cellar')
    expect(screen.getByText('Grey and wet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
  })

  it('saves only the Player-facing fields and opens the Scene with "{name} saved." and focus on that link (SP-UX-55, SP-A11Y-33)', async () => {
    mutate.mockImplementation((_values, options) => options.onSuccess({ id: 'l1', playerFacingName: 'A shape in the cellar!' }))
    renderPage()

    await userEvent.type(screen.getByLabelText('Player-facing name'), '!')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(mutate).toHaveBeenCalledWith({ playerFacingName: 'A shape in the cellar!', playerFacingDescription: description }, expect.any(Object))
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
      params: { campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' },
      state: { statusMessage: 'A shape in the cellar! saved.', focusLinkId: 'l1' },
    })
  })

  it('refuses an empty name without saving (SP-UX-53)', async () => {
    renderPage()

    await userEvent.clear(screen.getByLabelText('Player-facing name'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByLabelText('Player-facing name')).toHaveAccessibleDescription(/Enter a Player-facing name\./)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('shows the server message at the field and alerts on other failures', () => {
    mockUseEdit.mockReturnValue(
      editing({ isError: true, error: new NonPlayerEntityLinkValidationError({ playerFacingName: 'Player-facing name must be 200 characters or fewer.' }) }),
    )
    const { unmount } = renderPage()
    expect(screen.getByLabelText('Player-facing name')).toHaveAccessibleDescription(/Player-facing name must be 200 characters or fewer\./)
    unmount()

    mockUseEdit.mockReturnValue(editing({ isError: true, error: new Error('boom') }))
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't save the link. Try again.")
  })

  it('keeps the form with the Finished conflict when the Scene was finished meanwhile (SP-UX-57)', () => {
    mockUseEdit.mockReturnValue(editing({ isError: true, error: new SceneFinishedError() }))

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent(
      "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel.",
    )
  })

  it('says a Finished Scene cannot be changed instead of showing the form (SP-UX-57)', () => {
    mockUseScene.mockReturnValue({ data: { ...scene, status: 'Finished' } })

    renderPage()

    expect(screen.getByText("This Scene is finished and can't be changed.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the Scene' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Player-facing name')).not.toBeInTheDocument()
  })

  it('shows the link not-found page for an unknown link id or a 404 on save (SP-UX-60)', () => {
    const { unmount } = renderPage('unknown')
    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that link" })).toBeInTheDocument()
    unmount()

    mockUseEdit.mockReturnValue(editing({ isError: true, error: new NonPlayerEntityLinkNotFoundError() }))
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that link" })).toBeInTheDocument()
  })

  it('shows the Scene not-found page to a Player or for an unknown Scene, and asks the API for nothing (SP-UX-60)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    mockUseScene.mockReturnValue({ data: undefined })
    const { unmount } = renderPage()
    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
    expect(mockUseScene).toHaveBeenCalledWith('c1', 's1', 'a1', false)
    unmount()

    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseScene.mockReturnValue({ data: null })
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
  })

  it('shows busy placeholders while loading and disables Save while saving (SP-UX-61)', () => {
    mockUseScene.mockReturnValue({ data: undefined })
    const { container, unmount } = renderPage()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    unmount()

    mockUseScene.mockReturnValue({ data: scene })
    mockUseEdit.mockReturnValue(editing({ isPending: true }))
    renderPage()
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
  })
})
