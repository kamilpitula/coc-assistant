import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Scene } from '@/scenario-preparation/types/Scene'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'

import { ToRevealSection } from './to-reveal-section'

// specs/scene-play/ux.md section 21.4; SPL-UX-42, SPL-UX-43, SPL-A11Y-16.
// Section 22.1; SPL-UX-51: linked Items follow the entities, each with its Player-facing Handouts.
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
    { id: 'h3', kind: 'Text', visibility: 'PlayerFacing', title: 'Boston Globe clipping' },
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
        handouts: [{ id: 'h9', kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' }],
      },
    },
  ],
}

const reveal = (overrides: Partial<KeeperReveal> = {}): KeeperReveal => ({
  revealId: 'r1',
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title: 'The front door',
  handoutKind: 'ReadAloud',
  content: null,
  file: null,
  imageDescription: null,
  subjectId: 'h1',
  recipients: [{ id: 'i1', name: 'Harvey Walters' }],
  ...overrides,
})

const scene = (reveals: KeeperReveal[] = []): KeeperActiveScene => ({
  kind: 'keeper',
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [
    { id: 'i1', name: 'Harvey Walters' },
    { id: 'i2', name: 'Lucy Ward' },
  ],
  reveals,
})

describe('ToRevealSection', () => {
  const onReveal = vi.fn()
  const onGive = vi.fn()
  const renderSection = (active: KeeperActiveScene = scene()) =>
    render(
      <SidePanelScopeProvider>
        <ToRevealSection campaignId="c1" scene={active} onReveal={onReveal} onGive={onGive} />
      </SidePanelScopeProvider>,
    )

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseScene.mockReturnValue({ data: material, isError: false, refetch: refetchScene })
    mockUseHolderNames.mockReturnValue({
      names: new Map([
        ['i1', 'Harvey Walters'],
        ['i2', 'Lucy Ward'],
      ]),
      isError: false,
      refetch: refetchNames,
    })
  })

  it('reads the Keeper Scene by the ids of the Active Scene', () => {
    renderSection()

    expect(mockUseScene).toHaveBeenCalledWith('c1', 'p1', 's1', true)
  })

  it('lists Player-facing Handouts in stored order, then entity links, with the hint (SPL-UX-42)', () => {
    renderSection()

    const section = screen.getByRole('region', { name: 'To reveal' })
    expect(within(section).getByRole('heading', { level: 2, name: 'To reveal' })).toBeInTheDocument()
    expect(section).toHaveTextContent("Player-facing material that hasn't reached every Investigator present.")
    expect(within(section).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Handouts',
      'Non-Player Entities',
    ])
    expect(within(section).getByRole('button', { name: 'The front door' })).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('keeps Keeper-only material and completed subjects off the list (SPL-UX-42, SPL-UX-45)', () => {
    renderSection(
      scene([reveal({ subjectId: 'h1', recipients: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: 'Lucy Ward' }] })]),
    )

    const section = screen.getByRole('region', { name: 'To reveal' })
    expect(within(section).queryByRole('button', { name: 'The front door' })).not.toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: "Corbitt's true nature" })).not.toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'Boston Globe clipping' })).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'The landlord' })).toBeInTheDocument()
  })

  it('omits a type group with no entries', () => {
    renderSection(
      scene([
        reveal({ subjectId: 'h1', recipients: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: 'Lucy Ward' }] }),
        reveal({ subjectId: 'h3', recipients: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: 'Lucy Ward' }] }),
      ]),
    )

    expect(screen.queryByRole('heading', { level: 3, name: 'Handouts' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Non-Player Entities' })).toBeInTheDocument()
  })

  it('shows the status line once anyone received the subject, and "Reveal..." on every entry (SPL-UX-42)', () => {
    renderSection(scene([reveal()]))

    const section = screen.getByRole('region', { name: 'To reveal' })
    expect(within(section).getByText('Revealed to Harvey Walters . not yet: Lucy Ward')).toBeInTheDocument()
    expect(within(section).getAllByRole('button', { name: /^Reveal / })).toHaveLength(3)
  })

  it('says everything reached everyone when the list is empty', () => {
    renderSection(
      scene([
        reveal({ subjectId: 'h1', recipients: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: 'Lucy Ward' }] }),
        reveal({ subjectId: 'h3', recipients: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: 'Lucy Ward' }] }),
        reveal({
          revealId: 'r2',
          subjectId: 'l1',
          subjectType: 'NonPlayerEntity',
          title: 'The landlord',
          handoutKind: null,
          recipients: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: 'Lucy Ward' }],
        }),
      ]),
    )

    expect(screen.getByText('Everything Player-facing has reached every Investigator present.')).toBeInTheDocument()
  })

  it('passes the completion baseline and focus fallbacks to the reveal flow (SPL-UX-21, SPL-A11Y-17)', async () => {
    renderSection(scene([reveal()]))

    await userEvent.click(screen.getByRole('button', { name: 'Reveal The front door' }))
    const headingId = screen.getByRole('heading', { level: 2, name: 'To reveal' }).id
    expect(headingId).not.toBe('')
    expect(onReveal.mock.calls[0][1]).toEqual({ alreadyRevealedIds: ['i1'], fallbackIds: ['handout-link-h3', headingId] })

    await userEvent.click(screen.getByRole('button', { name: 'Reveal The landlord' }))
    expect(onReveal.mock.calls[1][1]).toEqual({ alreadyRevealedIds: [], fallbackIds: ['handout-link-h3', headingId] })
  })

  it('opens the reveal dialog for the entry (SPL-UX-21)', async () => {
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: 'Reveal The front door' }))

    expect(onReveal).toHaveBeenCalledTimes(1)
    expect(onReveal.mock.calls[0][0]).toEqual({
      subjectType: 'Handout',
      subjectId: 'h1',
      title: 'The front door',
      summary: 'Read-aloud . Player-facing',
      triggerId: 'reveal-trigger-h1',
    })
  })

  it('shows a Skeleton while loading and a retry when the material fails, without the list', async () => {
    mockUseScene.mockReturnValue({ data: undefined, isError: false, refetch: refetchScene })
    const { unmount } = renderSection()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'To reveal' })).not.toBeInTheDocument()
    unmount()

    mockUseScene.mockReturnValue({ data: undefined, isError: true, refetch: refetchScene })
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(refetchScene).toHaveBeenCalledTimes(1)
  })

  it('lists linked Items with their Player-facing Handouts after the entities (SPL-UX-51)', () => {
    mockUseScene.mockReturnValue({ data: materialWithItems, isError: false, refetch: refetchScene })
    renderSection()

    const section = screen.getByRole('region', { name: 'To reveal' })
    expect(within(section).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Handouts',
      'Non-Player Entities',
      'Items',
    ])
    expect(within(section).getByRole('button', { name: "Walter Corbitt's diary" })).toHaveAttribute('aria-haspopup', 'dialog')
    expect(within(section).getByText('Item')).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'The last entry' })).toBeInTheDocument()
    expect(within(section).getByText("Item: Walter Corbitt's diary")).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: "Give Walter Corbitt's diary" })).toBeInTheDocument()
  })

  it('opens the `item` panel from an Item title (SPL-UX-51)', async () => {
    mockUseScene.mockReturnValue({ data: materialWithItems, isError: false, refetch: refetchScene })
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: "Walter Corbitt's diary" }))

    expect(mockUseSidePanelOpen).toHaveBeenCalledWith({ type: 'item', itemId: 'k1' }, expect.anything())
  })

  it('joins the reveal status with the holder on an Item entry (SPL-UX-51)', () => {
    mockUseScene.mockReturnValue({ data: materialWithItems, isError: false, refetch: refetchScene })
    renderSection(scene([reveal({ subjectId: 'k1', subjectType: 'Item', title: "Walter Corbitt's diary" })]))

    expect(screen.getByText('Revealed to Harvey Walters . not yet: Lucy Ward . Held by Harvey Walters')).toBeInTheDocument()
  })

  it('shows the reveal status without the holder until the names resolve', () => {
    mockUseScene.mockReturnValue({ data: materialWithItems, isError: false, refetch: refetchScene })
    mockUseHolderNames.mockReturnValue({ names: undefined, isError: false, refetch: refetchNames })
    renderSection(scene([reveal({ subjectId: 'k1', subjectType: 'Item', title: "Walter Corbitt's diary" })]))

    expect(screen.getByText('Revealed to Harvey Walters . not yet: Lucy Ward')).toBeInTheDocument()
    expect(screen.queryByText(/Held by/)).not.toBeInTheDocument()
  })

  it('opens the give dialog from "Give..." with the focus fallbacks (SPL-UX-51)', async () => {
    mockUseScene.mockReturnValue({ data: materialWithItems, isError: false, refetch: refetchScene })
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: "Give Walter Corbitt's diary" }))

    const headingId = screen.getByRole('heading', { level: 2, name: 'To reveal' }).id
    expect(onGive).toHaveBeenCalledTimes(1)
    expect(onGive.mock.calls[0][0]).toEqual({
      itemId: 'k1',
      itemName: "Walter Corbitt's diary",
      holder: { id: 'i1', name: 'Harvey Walters' },
      triggerId: 'give-trigger-k1',
    })
    expect(onGive.mock.calls[0][1]).toEqual({ fallbackIds: ['handout-link-h9', 'entity-link-l1', headingId] })
  })

  it('opens the reveal dialog for an Item and its Handout entries (SPL-UX-51)', async () => {
    mockUseScene.mockReturnValue({ data: materialWithItems, isError: false, refetch: refetchScene })
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: "Reveal Walter Corbitt's diary" }))
    expect(onReveal.mock.calls[0][0]).toEqual({
      subjectType: 'Item',
      subjectId: 'k1',
      title: "Walter Corbitt's diary",
      summary: 'Item',
      triggerId: 'reveal-trigger-k1',
    })

    await userEvent.click(screen.getByRole('button', { name: 'Reveal The last entry' }))
    expect(onReveal.mock.calls[1][0]).toEqual({
      subjectType: 'Handout',
      subjectId: 'h9',
      title: 'The last entry',
      summary: 'Text . Player-facing',
      triggerId: 'reveal-trigger-h9',
    })
  })
})
