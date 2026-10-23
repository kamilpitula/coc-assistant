import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { corbittHouse, sceneContext } from '@/scenario-preparation/test-support/handoutOwnerFixtures'
import type { Scene } from '@/scenario-preparation/types/Scene'

import { SceneHandoutRoute } from './scene-handout-route'

// specs/scenario-preparation/ux.md sections 42 and 43; SP-UX-74: a Player and an unknown Scene get the Scene not-found page and
// no request; a loaded Scene decides what the Handout pages offer.

const { mockUseCampaign, mockUseSceneHandoutContext, refetch } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseSceneHandoutContext: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useSceneHandoutContext', () => ({ useSceneHandoutContext: mockUseSceneHandoutContext }))
vi.mock('@/scenario-preparation/components/handout-page/handout-page', () => ({
  HandoutPage: ({ handoutId, context }: { handoutId: string; context: { backLabel: string } }) => (
    <p>
      Handout page {handoutId} {context.backLabel}
    </p>
  ),
}))
vi.mock('@/scenario-preparation/components/add-handout-page/add-handout-page', () => ({
  AddHandoutPage: ({ context }: { context: { backLabel: string } }) => <p>Add Handout page {context.backLabel}</p>,
}))

const loaded = (scene: Scene) => ({ scene: { data: scene, isError: false, refetch }, context: sceneContext(scene.status) })
const pending = { scene: { data: undefined, isError: false, refetch }, context: null }

const renderRoute = (handoutId?: string) => render(<SceneHandoutRoute campaignId="c1" scenarioId="s1" sceneId="a1" handoutId={handoutId} />)

describe('SceneHandoutRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseSceneHandoutContext.mockReturnValue(loaded(corbittHouse('Prepared')))
  })

  it('shows the Handout page for a Handout id, with what the Scene allows', () => {
    renderRoute('h1')

    expect(screen.getByText('Handout page h1 Back to the Scene')).toBeInTheDocument()
  })

  it('shows the Add Handout page without a Handout id', () => {
    renderRoute()

    expect(screen.getByText('Add Handout page Back to the Scene')).toBeInTheDocument()
  })

  it('asks for the Scene of the owner and enables the query for the Keeper', () => {
    renderRoute('h1')

    expect(mockUseSceneHandoutContext).toHaveBeenLastCalledWith({ type: 'scene', campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' }, true)
  })

  it('shows the Scene not-found page to a Player and enables no query (SP-UX-74)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })

    renderRoute('h1')

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
    expect(mockUseSceneHandoutContext).toHaveBeenLastCalledWith(expect.objectContaining({ sceneId: 'a1' }), false)
  })

  it('shows the Scene not-found page for an unknown Scene (SP-UX-74)', () => {
    mockUseSceneHandoutContext.mockReturnValue({ scene: { data: null, isError: false, refetch }, context: null })

    renderRoute()

    expect(screen.getByRole('heading', { level: 1, name: "We couldn't find that Scene" })).toBeInTheDocument()
  })

  it('shows a Skeleton with aria-busy while the Scene loads', () => {
    mockUseSceneHandoutContext.mockReturnValue(pending)

    const { container } = renderRoute('h1')

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('says it could not load the Handout and offers Try again when the Scene fails to load', () => {
    mockUseSceneHandoutContext.mockReturnValue({ scene: { data: undefined, isError: true, refetch }, context: null })

    renderRoute('h1')

    expect(screen.getByText("We couldn't load this Handout.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('says it could not load the Scene on the Add Handout page', () => {
    mockUseSceneHandoutContext.mockReturnValue({ scene: { data: undefined, isError: true, refetch }, context: null })

    renderRoute()

    expect(screen.getByText("We couldn't load this Scene.")).toBeInTheDocument()
  })
})
