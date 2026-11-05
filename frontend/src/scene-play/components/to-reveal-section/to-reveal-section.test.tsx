import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Scene } from '@/scenario-preparation/types/Scene'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'

import { ToRevealSection } from './to-reveal-section'

// specs/scene-play/ux.md section 21.4; SPL-UX-42, SPL-UX-43, SPL-A11Y-16.
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
    { id: 'h3', kind: 'Text', visibility: 'PlayerFacing', title: 'Boston Globe clipping' },
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
  const renderSection = (active: KeeperActiveScene = scene()) =>
    render(
      <SidePanelScopeProvider>
        <ToRevealSection campaignId="c1" scene={active} onReveal={onReveal} />
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
      summary: 'Read-aloud \u00b7 Player-facing',
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
})
