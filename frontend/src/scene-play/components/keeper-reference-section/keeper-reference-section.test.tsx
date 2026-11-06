import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Scene } from '@/scenario-preparation/types/Scene'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'

import { KeeperReferenceSection } from './keeper-reference-section'

// specs/scene-play/ux.md section 21.5; SPL-UX-45, SPL-A11Y-16.
const { mockUseScene, mockUseSidePanelOpen, refetchScene } = vi.hoisted(() => ({
  mockUseScene: vi.fn(),
  mockUseSidePanelOpen: vi.fn(),
  refetchScene: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/shared/hooks/useSidePanel', () => ({ useSidePanel: () => ({ open: mockUseSidePanelOpen }) }))

const material: Scene = {
  id: 's1',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: null,
  finishedAt: null,
  location: '',
  keeperNotes: null,
  itemLinks: [],
  nonPlayerEntityLinks: [
    {
      id: 'l1',
      nonPlayerEntity: { id: 'n1', type: 'HumanNpc', name: 'Mr. Knott' },
      playerFacingName: 'The landlord',
      playerFacingDescription: null,
    },
  ],
  handouts: [
    { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' },
    { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: "Corbitt's true nature" },
  ],
}

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }],
  reveals: [],
}

describe('KeeperReferenceSection', () => {
  const renderSection = () =>
    render(
      <SidePanelScopeProvider>
        <KeeperReferenceSection campaignId="c1" scene={scene} />
      </SidePanelScopeProvider>,
    )

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseScene.mockReturnValue({ data: material, isError: false, refetch: refetchScene })
  })

  it('reads the Keeper Scene by the ids of the Active Scene', () => {
    renderSection()

    expect(mockUseScene).toHaveBeenCalledWith('c1', 'p1', 's1', true)
  })

  it('lists Keeper-facing Handouts in stored order, then every link, with the hint (SPL-UX-45)', () => {
    renderSection()

    const section = screen.getByRole('region', { name: 'Keeper reference' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Keeper reference' })).toBeInTheDocument()
    expect(section).toHaveTextContent('Only you see these: Keeper-facing Handouts and the profiles behind Non-Player Entities.')
    expect(within(section).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Handouts',
      'Non-Player Entities',
    ])
    expect(within(section).queryByRole('button', { name: 'The front door' })).not.toBeInTheDocument()
    expect(within(section).getByRole('button', { name: "Corbitt's true nature" })).toHaveAttribute('aria-haspopup', 'dialog')
    expect(within(section).getByRole('button', { name: 'The landlord' })).toBeInTheDocument()
  })

  it('offers no Reveal trigger and no reveal status (SPL-UX-45)', async () => {
    renderSection()

    const section = screen.getByRole('region', { name: 'Keeper reference' })
    expect(within(section).queryByRole('button', { name: /^Reveal / })).not.toBeInTheDocument()
    expect(within(section).queryByText(/Revealed to/)).not.toBeInTheDocument()

    await userEvent.click(within(section).getByRole('button', { name: 'The landlord' }))
    expect(mockUseSidePanelOpen).toHaveBeenCalledWith({ type: 'entity', linkId: 'l1' }, expect.any(HTMLElement))
  })

  it('omits a type group with no entries, and says the Scene has nothing Keeper-only when both are empty', () => {
    mockUseScene.mockReturnValue({ data: { ...material, handouts: material.handouts.filter((handout) => handout.visibility === 'PlayerFacing') }, isError: false, refetch: refetchScene })
    renderSection()

    expect(screen.queryByRole('heading', { level: 3, name: 'Handouts' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Non-Player Entities' })).toBeInTheDocument()

    mockUseScene.mockReturnValue({ data: { ...material, handouts: [], nonPlayerEntityLinks: [] }, isError: false, refetch: refetchScene })
    renderSection()
    expect(screen.getByText('Nothing Keeper-only in this Scene.')).toBeInTheDocument()
  })

  it('shows a Skeleton while loading and a retry when the material fails, without the list', async () => {
    mockUseScene.mockReturnValue({ data: undefined, isError: false, refetch: refetchScene })
    const { unmount } = renderSection()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Keeper reference' })).not.toBeInTheDocument()
    unmount()

    mockUseScene.mockReturnValue({ data: undefined, isError: true, refetch: refetchScene })
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(refetchScene).toHaveBeenCalledTimes(1)
  })
})
