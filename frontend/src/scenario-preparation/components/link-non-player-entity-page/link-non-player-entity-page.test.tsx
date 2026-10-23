import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NonPlayerEntityLinkNotFoundError, NonPlayerEntityLinkValidationError } from '@/scenario-preparation/services/nonPlayerEntityLinkApi'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { navigateSpy } from '@/shared/test-support/routerMock'

import { LinkNonPlayerEntityPage } from './link-non-player-entity-page'

// specs/scenario-preparation/ux.md section 33; SP-UX-51 to SP-UX-54, SP-UX-57, SP-UX-60 to SP-UX-63.

const { mockUseCampaign, mockUseScene, mockUseEntities, mockUseLink, mutate, refetchEntities } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseScene: vi.fn(),
  mockUseEntities: vi.fn(),
  mockUseLink: vi.fn(),
  mutate: vi.fn(),
  refetchEntities: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntities', () => ({ useNonPlayerEntities: mockUseEntities }))
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntityLinks', () => ({ useLinkNonPlayerEntity: mockUseLink }))

const scene: Scene = {
  id: 'a1',
  title: 'The Corbitt House',
  location: '',
  keeperNotes: null,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [
    { id: 'l1', nonPlayerEntity: { id: 'm1', type: 'MythosCreature', name: 'Ghoul' }, playerFacingName: 'Earlier', playerFacingDescription: null },
  ],
  itemLinks: [],
  handouts: [],
}
const entities = [
  { id: 'm1', type: 'MythosCreature' as const, name: 'Ghoul' },
  { id: 'h1', type: 'HumanNpc' as const, name: 'Mr. Knott' },
]

const linking = (overrides: Record<string, unknown> = {}) => ({ mutate, isPending: false, isError: false, error: null, ...overrides })
const renderPage = () => render(<LinkNonPlayerEntityPage campaignId="c1" scenarioId="s1" sceneId="a1" />)

describe('LinkNonPlayerEntityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseScene.mockReturnValue({ data: scene })
    mockUseEntities.mockReturnValue({ data: entities, isPending: false, isError: false, refetch: refetchEntities })
    mockUseLink.mockReturnValue(linking())
  })

  it('shows one h1, the Scene it belongs to, the picker, the empty name, and a Cancel link back to the Scene (SP-A11Y-30, SP-UX-63)', () => {
    renderPage()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Link a Non-Player Entity' })).toBeInTheDocument()
    expect(screen.getByText('Scene: The Corbitt House')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Non-Player Entity' })).toBeInTheDocument()
    expect(screen.getByLabelText('Player-facing name')).toHaveValue('')
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
  })

  it('offers an entity already linked again, marked as such (SP-UX-54)', () => {
    renderPage()

    expect(screen.getByRole('radio', { name: 'Ghoul' })).toHaveAccessibleDescription('Mythos Creature Already in this Scene')
  })

  it('links the chosen entity and opens the Scene with "{name} linked." and focus on that link (SP-UX-52, SP-A11Y-33)', async () => {
    mutate.mockImplementation((_values, options) => options.onSuccess({ id: 'l9', playerFacingName: 'A shape in the cellar' }))
    renderPage()

    await userEvent.click(screen.getByRole('radio', { name: 'Ghoul' }))
    await userEvent.type(screen.getByLabelText('Player-facing name'), 'A shape in the cellar')
    await userEvent.click(screen.getAllByRole('button', { name: 'Link' }).find((button) => button.getAttribute('type') === 'submit')!)

    expect(mutate).toHaveBeenCalledWith(
      { nonPlayerEntity: { type: 'MythosCreature', id: 'm1' }, playerFacingName: 'A shape in the cellar', playerFacingDescription: null },
      expect.any(Object),
    )
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
      params: { campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' },
      state: { statusMessage: 'A shape in the cellar linked.', focusLinkId: 'l9' },
    })
  })

  it('shows the server messages at the fields and refetches the entities when the entity was refused (SP-UX-53)', () => {
    mockUseLink.mockReturnValue(
      linking({
        isError: true,
        error: new NonPlayerEntityLinkValidationError({ nonPlayerEntity: 'Choose a Non-Player Entity from this Campaign.' }),
      }),
    )

    renderPage()

    expect(screen.getByRole('group', { name: 'Non-Player Entity' })).toHaveAccessibleDescription('Choose a Non-Player Entity from this Campaign.')
    expect(refetchEntities).toHaveBeenCalled()
  })

  it('alerts on a failure and keeps the form', () => {
    mockUseLink.mockReturnValue(linking({ isError: true, error: new Error('boom') }))

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't link the Non-Player Entity. Try again.")
    expect(screen.getByLabelText('Player-facing name')).toBeInTheDocument()
  })

  it('keeps the form with the Finished conflict when a save is refused because the Scene was finished meanwhile (SP-UX-57)', () => {
    mockUseLink.mockReturnValue(linking({ isError: true, error: new SceneFinishedError() }))

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent(
      "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel.",
    )
    expect(screen.getByLabelText('Player-facing name')).toBeInTheDocument()
  })

  it('shows the link not-found page when a save answers 404 (SP-UX-60)', () => {
    mockUseLink.mockReturnValue(linking({ isError: true, error: new NonPlayerEntityLinkNotFoundError() }))

    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that link" })).toBeInTheDocument()
  })

  it('says a Finished Scene cannot be changed instead of showing the form (SP-UX-57)', () => {
    mockUseScene.mockReturnValue({ data: { ...scene, status: 'Finished' } })

    renderPage()

    expect(screen.getByText("This Scene is finished and can't be changed.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the Scene' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
    expect(screen.queryByLabelText('Player-facing name')).not.toBeInTheDocument()
  })

  it('shows the Scene not-found page to a Player and asks the API for nothing (SP-UX-60)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    mockUseScene.mockReturnValue({ data: undefined })

    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
    expect(mockUseScene).toHaveBeenCalledWith('c1', 's1', 'a1', false)
    expect(mockUseEntities).toHaveBeenCalledWith('c1', false)
  })

  it('shows the Scene not-found page for an unknown Scene and busy placeholders while loading', () => {
    mockUseScene.mockReturnValue({ data: null })
    const { unmount } = renderPage()
    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
    unmount()

    mockUseScene.mockReturnValue({ data: undefined })
    const { container } = renderPage()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('says the Campaign has no Non-Player Entities yet and links to create one (SP-UX-62)', () => {
    mockUseEntities.mockReturnValue({ data: [], isPending: false, isError: false, refetch: refetchEntities })

    renderPage()

    expect(screen.getByText('No Non-Player Entities yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Non-Player Entity' })).toHaveAttribute('href', '/campaigns/c1/non-player-entities/new')
  })

  it('disables Link while linking so a second activation does nothing (SP-UX-61)', () => {
    mockUseLink.mockReturnValue(linking({ isPending: true }))

    renderPage()

    expect(screen.getByRole('button', { name: 'Linking...' })).toBeDisabled()
  })
})
