import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ItemLinkNotFoundError, ItemLinkValidationError } from '@/scenario-preparation/services/itemLinkApi'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import type { ItemSummary } from '@/scenario-preparation/types/Item'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { navigateSpy } from '@/shared/test-support/routerMock'

import { LinkItemPage } from './link-item-page'

// specs/scenario-preparation/ux.md section 64.2; SP-UX-98, SP-UX-102, SP-A11Y-52, SP-A11Y-54, SP-A11Y-55.

const { mockUseCampaign, mockUseScene, mockUseItems, mockUseLink, linkMutate, refetchItems } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseScene: vi.fn(),
  mockUseItems: vi.fn(),
  mockUseLink: vi.fn(),
  linkMutate: vi.fn(),
  refetchItems: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/scenario-preparation/hooks/useItems', () => ({ useItems: mockUseItems }))
vi.mock('@/scenario-preparation/hooks/useItemLinks', () => ({ useLinkItem: mockUseLink }))

const diary: ItemSummary = { id: 'k1', name: "Walter Corbitt's diary", sceneCount: 1 }
const key: ItemSummary = { id: 'k2', name: 'The cellar key', sceneCount: 0 }

const scene: Scene = {
  id: 'a1',
  title: 'The Corbitt House',
  location: '',
  keeperNotes: null,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [],
  itemLinks: [{ id: 'l1', item: { id: 'k1', name: "Walter Corbitt's diary" } }],
  handouts: [],
}

const linking = (overrides: Record<string, unknown> = {}) => ({ mutate: linkMutate, isPending: false, isError: false, error: null, ...overrides })
const itemsQuery = (overrides: Record<string, unknown> = {}) => ({ data: [diary, key], isPending: false, isError: false, refetch: refetchItems, ...overrides })

const renderPage = () => render(<LinkItemPage campaignId="c1" scenarioId="s1" sceneId="a1" />)
const link = () => screen.getByRole('button', { name: 'Link' })

describe('LinkItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseScene.mockReturnValue({ data: scene })
    mockUseItems.mockReturnValue(itemsQuery())
    mockUseLink.mockReturnValue(linking())
  })

  it('shows one h1, the Scene it belongs to, the picker, and a Cancel link back to the Scene (SP-UX-98)', () => {
    renderPage()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Link an Item' })).toBeInTheDocument()
    expect(screen.getByText('Scene: The Corbitt House')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Item' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
  })

  it("offers the Campaign's Items and marks the one the Scene links as already in it (SP-UX-98)", () => {
    renderPage()

    expect(screen.getByRole('radio', { name: "Walter Corbitt's diary" })).toBeDisabled()
    expect(screen.getByRole('radio', { name: "Walter Corbitt's diary" })).toHaveAccessibleDescription('Already in this Scene')
    expect(screen.getByRole('radio', { name: 'The cellar key' })).toBeEnabled()
  })

  it('asks the picker for the list of the Campaign with the query enabled', () => {
    renderPage()

    expect(mockUseItems).toHaveBeenLastCalledWith('c1', true)
  })

  it('links the chosen Item and opens the Scene with "{name} linked." and focus on that Item (SP-UX-98, SP-A11Y-54)', async () => {
    linkMutate.mockImplementation((_itemId, options) => options.onSuccess({ id: 'l9', item: { id: 'k2', name: 'The cellar key' } }))
    renderPage()

    await userEvent.click(screen.getByRole('radio', { name: 'The cellar key' }))
    await userEvent.click(link())

    expect(linkMutate).toHaveBeenCalledWith('k2', expect.any(Object))
    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
      params: { campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' },
      state: { statusMessage: 'The cellar key linked.', focusItemLinkId: 'l9' },
    })
  })

  it('says "Choose an Item." at the picker when nothing is chosen, sends nothing, and focuses the first enabled radio (SP-UX-98, SP-A11Y-55)', async () => {
    renderPage()

    await userEvent.click(link())

    expect(linkMutate).not.toHaveBeenCalled()
    expect(screen.getByText('Choose an Item.')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Item' })).toHaveAccessibleDescription('Choose an Item.')
    expect(screen.getByRole('radio', { name: 'The cellar key' })).toHaveFocus()
  })

  it('removes the validation message once an Item is chosen', async () => {
    renderPage()

    await userEvent.click(link())
    await userEvent.click(screen.getByRole('radio', { name: 'The cellar key' }))

    expect(screen.queryByText('Choose an Item.')).not.toBeInTheDocument()
  })

  it('shows the busy label and a disabled button while linking', () => {
    mockUseLink.mockReturnValue(linking({ isPending: true }))

    renderPage()

    expect(screen.getByRole('button', { name: 'Linking...' })).toBeDisabled()
  })

  it('shows the server message for an Item outside the Campaign at the picker, reloads the list, and focuses the picker (SP-UX-98)', () => {
    mockUseLink.mockReturnValue(
      linking({ isError: true, error: new ItemLinkValidationError('Choose an Item of this Campaign.') }),
    )

    renderPage()

    expect(screen.getByText('Choose an Item of this Campaign.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(refetchItems).toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: 'The cellar key' })).toHaveFocus()
  })

  it('alerts when the link failed, and keeps the picker (SP-UX-98)', () => {
    mockUseLink.mockReturnValue(linking({ isError: true, error: new Error('boom') }))

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't link the Item. Try again.")
    expect(screen.getByRole('group', { name: 'Item' })).toBeInTheDocument()
  })

  it('keeps the page with the Finished message when the Scene was finished meanwhile (SP-UX-98)', () => {
    mockUseLink.mockReturnValue(linking({ isError: true, error: new SceneFinishedError() }))

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent("This Scene has been finished, so it can't be changed. Select Cancel to go back.")
    expect(screen.getByRole('link', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('shows the Finished sentence and only the way back instead of the form for a Finished Scene (SP-UX-98)', () => {
    mockUseScene.mockReturnValue({ data: { ...scene, status: 'Finished' } })

    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Link an Item' })).toBeInTheDocument()
    expect(screen.getByText("This Scene is finished and can't be changed.")).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Item' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the Scene' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1')
  })

  it('offers the form on an Active Scene (SP-UX-97)', () => {
    mockUseScene.mockReturnValue({ data: { ...scene, status: 'Active' } })

    renderPage()

    expect(screen.getByRole('group', { name: 'Item' })).toBeInTheDocument()
  })

  it('shows the Scene not-found page to a Player and for an unknown Scene, and enables no query for a Player (SP-UX-102)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    const { unmount } = renderPage()
    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
    expect(mockUseScene).toHaveBeenLastCalledWith('c1', 's1', 'a1', false)
    expect(mockUseItems).toHaveBeenLastCalledWith('c1', false)
    unmount()

    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseScene.mockReturnValue({ data: null })
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
  })

  it('shows the Scene not-found page when a link answers 404', () => {
    mockUseLink.mockReturnValue(linking({ isError: true, error: new ItemLinkNotFoundError() }))

    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
  })

  it('shows a Skeleton with aria-busy while the Scene loads', () => {
    mockUseScene.mockReturnValue({ data: undefined })

    const { container } = renderPage()

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })
})
