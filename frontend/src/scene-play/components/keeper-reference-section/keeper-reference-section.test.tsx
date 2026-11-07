import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Scene } from '@/scenario-preparation/types/Scene'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'

import { KeeperReferenceSection } from './keeper-reference-section'

// specs/scene-play/ux.md section 21.5; SPL-UX-45, SPL-A11Y-16.
// Section 22.2; SPL-UX-56: every linked Item with its holder and Keeper-facing Handouts, without "Reveal...".
const { mockUseScene, mockUseSidePanelOpen, mockUseHolderNames, refetchScene, refetchNames } = vi.hoisted(() => ({
  mockUseScene: vi.fn(),
  mockUseSidePanelOpen: vi.fn(),
  mockUseHolderNames: vi.fn(),
  refetchScene: vi.fn(),
  refetchNames: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/shared/hooks/useSidePanel', () => ({ useSidePanel: () => ({ open: mockUseSidePanelOpen }) }))
vi.mock('@/campaign-play/hooks/useApprovedInvestigatorNames', () => ({ useApprovedInvestigatorNames: mockUseHolderNames }))

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

const materialWithItems: Scene = {
  ...material,
  itemLinks: [
    {
      id: 'k1-link',
      item: {
        id: 'k1',
        name: "Walter Corbitt's diary",
        holder: { investigatorId: 'i1' },
        handouts: [
          { id: 'h9', kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' },
          { id: 'h8', kind: 'Text', visibility: 'KeeperFacing', title: 'A hidden inscription' },
        ],
      },
    },
    {
      id: 'k2-link',
      item: { id: 'k2', name: 'Brass key', holder: null, handouts: [] },
    },
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
  const onGive = vi.fn()
  const onTakeBack = vi.fn()
  const renderSection = () =>
    render(
      <SidePanelScopeProvider>
        <KeeperReferenceSection campaignId="c1" scene={scene} onGive={onGive} onTakeBack={onTakeBack} />
      </SidePanelScopeProvider>,
    )

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseScene.mockReturnValue({ data: material, isError: false, refetch: refetchScene })
    mockUseHolderNames.mockReturnValue({ names: new Map([['i1', 'Harvey Walters']]), isError: false, refetch: refetchNames })
  })

  it('reads the Keeper Scene by the ids of the Active Scene', () => {
    renderSection()

    expect(mockUseScene).toHaveBeenCalledWith('c1', 'p1', 's1', true)
  })

  it('lists Keeper-facing Handouts in stored order, then every link, with the hint (SPL-UX-45)', () => {
    renderSection()

    const section = screen.getByRole('region', { name: 'Keeper reference' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Keeper reference' })).toBeInTheDocument()
    expect(section).toHaveTextContent("Only you see these: Keeper-facing Handouts, the profiles behind Non-Player Entities, and Items' Keeper notes.")
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

  it('lists every linked Item with its holder and Keeper-facing Handouts after the links, without "Reveal..." (SPL-UX-56)', () => {
    mockUseScene.mockReturnValue({ data: materialWithItems, isError: false, refetch: refetchScene })
    renderSection()

    const section = screen.getByRole('region', { name: 'Keeper reference' })
    expect(section).toHaveTextContent(
      "Only you see these: Keeper-facing Handouts, the profiles behind Non-Player Entities, and Items' Keeper notes.",
    )
    expect(within(section).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Handouts',
      'Non-Player Entities',
      'Items',
    ])
    expect(within(section).getByRole('button', { name: "Walter Corbitt's diary" })).toHaveAttribute('aria-haspopup', 'dialog')
    expect(within(section).getByText('Held by Harvey Walters.')).toBeInTheDocument()
    expect(within(section).getByText('Held by no one.')).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'A hidden inscription' })).toBeInTheDocument()
    expect(within(section).getByText("Item: Walter Corbitt's diary")).toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: 'The last entry' })).not.toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: /^Reveal / })).not.toBeInTheDocument()
    expect(within(section).queryByText(/Revealed to/)).not.toBeInTheDocument()
  })

  it('opens the `item` panel from an Item title (SPL-UX-56)', async () => {
    mockUseScene.mockReturnValue({ data: materialWithItems, isError: false, refetch: refetchScene })
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: "Walter Corbitt's diary" }))

    expect(mockUseSidePanelOpen).toHaveBeenCalledWith({ type: 'item', itemId: 'k1' }, expect.any(HTMLElement))
  })

  it('offers "Give..." on every Item and "Take back" only while someone holds it (SPL-UX-56)', async () => {
    mockUseScene.mockReturnValue({ data: materialWithItems, isError: false, refetch: refetchScene })
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: "Give Walter Corbitt's diary" }))
    const headingId = screen.getByRole('heading', { level: 2, name: 'Keeper reference' }).id
    expect(onGive).toHaveBeenCalledTimes(1)
    expect(onGive.mock.calls[0][0]).toEqual({
      itemId: 'k1',
      itemName: "Walter Corbitt's diary",
      holder: { id: 'i1', name: 'Harvey Walters' },
      triggerId: 'give-trigger-k1',
    })
    expect(onGive.mock.calls[0][1]).toEqual({ fallbackIds: ['handout-link-h8', 'entity-link-l1', headingId] })

    await userEvent.click(screen.getByRole('button', { name: "Take back Walter Corbitt's diary" }))
    expect(onTakeBack).toHaveBeenCalledTimes(1)
    expect(onTakeBack.mock.calls[0][0]).toEqual({
      itemId: 'k1',
      itemName: "Walter Corbitt's diary",
      holderId: 'i1',
      holderName: 'Harvey Walters',
      triggerId: 'take-back-trigger-k1',
    })

    expect(screen.getByRole('button', { name: 'Give Brass key' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Take back Brass key' })).not.toBeInTheDocument()
  })
})
