import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PresentPlayerActiveScene } from '@/scene-play/types/ActiveScene'
import type { PlayerReveal } from '@/scene-play/types/Reveal'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'

import { ActiveScenePlayerView } from './active-scene-player-view'

// specs/scene-play/ux.md sections 4 and 14; SPL-UX-12, SPL-UX-13, SPL-UX-26, SPL-UX-35, SPL-A11Y-1, SPL-A11Y-4, SPL-A11Y-8.
const { mockUseMine, wallProps } = vi.hoisted(() => ({
  mockUseMine: vi.fn(),
  wallProps: { current: null as null | Record<string, unknown> },
}))
vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/components/active-scene-wall/active-scene-wall', () => ({
  ActiveSceneWall: (props: Record<string, unknown>) => {
    wallProps.current = props
    return (
      <section aria-labelledby="wall-stub-heading">
        <h2 id="wall-stub-heading">Wall</h2>
      </section>
    )
  },
}))
vi.mock('@/scene-play/hooks/useHeldItems', () => ({
  useMyHeldItems: mockUseMine,
  useInvestigatorHeldItems: vi.fn(),
  useTakeBackItem: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealFile: vi.fn() }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const reveal = (revealId: string, title: string, overrides: Partial<PlayerReveal> = {}): PlayerReveal => ({
  revealId,
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title,
  handoutKind: 'ReadAloud',
  content: { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [text(`Text of ${title}`)] }] } },
  file: null,
  imageDescription: null,
  ...overrides,
})

const present = (reveals: PlayerReveal[] = []): PresentPlayerActiveScene =>
  ({
    kind: 'present-player',
    reveals,
    title: 'The Corbitt House',
    location: 'Arkham, Boston Road',
    investigatorsPresent: [
      { name: 'Harvey Walters', isYours: true },
      { name: 'Lucy Ward', isYours: false },
    ],
  })

describe('ActiveScenePlayerView', () => {
  beforeEach(() => {
    mockUseMine.mockReturnValue({ data: undefined, isError: false, isFetchedAfterMount: false, refetch: vi.fn() })
  })

  const renderView = (scene: PresentPlayerActiveScene | { kind: 'absent-player'; title: string }) => {
    const headingRef = { current: null as HTMLHeadingElement | null }
    const view = render(
      <SidePanelScopeProvider>
        <ActiveScenePlayerView campaignId="c1" scene={scene} headingRef={headingRef} onWallEntryAdded={vi.fn()} />
      </SidePanelScopeProvider>,
    )
    return { ...view, headingRef }
  }

  it('exposes the h1 for panel focus return (NAV-A11Y-2)', () => {
    const { headingRef } = renderView(present())
    const h1 = screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })

    expect(h1).toHaveAttribute('tabindex', '-1')
    expect(headingRef.current).toBe(h1)
  })

  it('exposes the absent Player h1 for panel focus return too (NAV-A11Y-2)', () => {
    const { headingRef } = renderView({ kind: 'absent-player', title: 'The Corbitt House' })
    const h1 = screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })

    expect(h1).toHaveAttribute('tabindex', '-1')
    expect(headingRef.current).toBe(h1)
  })

  it('shows a present Player the title, location, who is present with their own marked, and the empty Reveals sentence', () => {
    renderView(present())

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeInTheDocument()
    expect(screen.getByText('Location').nextElementSibling).toHaveTextContent('Arkham, Boston Road')
    expect(screen.getByRole('region', { name: 'Investigators present' })).toBeInTheDocument()
    expect(screen.getByText('Harvey Walters (your Investigator)')).toBeInTheDocument()
    expect(screen.getByText('Lucy Ward')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Revealed to Harvey Walters' })).toBeInTheDocument()
    expect(screen.getByText("The Keeper hasn't revealed anything to Harvey Walters yet.")).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('shows the Player\'s Items after "Revealed to {name}" with the short Given time (SPL-UX-52)', () => {
    mockUseMine.mockReturnValue({
      data: { investigatorName: 'Harvey Walters', items: [] },
      isError: false,
      isFetchedAfterMount: true,
      refetch: vi.fn(),
    })
    renderView(present())

    expect(screen.getByRole('heading', { level: 2, name: "Items Harvey Walters holds" })).toBeInTheDocument()
    expect(screen.getByText("Harvey Walters doesn't hold any Items.")).toBeInTheDocument()
  })

  it('opens the Clues panel from "{name}\'s Clues" under "Revealed to {name}" (SPL-UX-26, G1)', () => {
    renderView(present())

    const section = screen.getByRole('region', { name: 'Revealed to Harvey Walters' })
    expect(within(section).getByRole('button', { name: "Harvey Walters's Clues" })).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('lists the Reveals as articles labelled by their h3, with the kind and time, newest first as given, and no empty sentence (SPL-UX-26, SPL-A11Y-8)', () => {
    renderView(present([reveal('r2', 'The cellar door'), reveal('r1', 'The front door', { handoutKind: 'Text' })]))

    const articles = screen.getAllByRole('article')
    expect(articles.map((article) => within(article).getByRole('heading', { level: 3 }).textContent)).toEqual(['The cellar door', 'The front door'])
    expect(within(articles[0]).getByText(/^Read-aloud.*Revealed/)).toBeInTheDocument()
    expect(within(articles[1]).getByText(/^Text.*Revealed/)).toBeInTheDocument()
    expect(within(articles[0]).getByText(/^Read-aloud.*Revealed/).querySelector('time')).toHaveAttribute('datetime', '2026-10-28T19:52:00Z')
    expect(within(articles[0]).getByText('Text of The cellar door')).toBeInTheDocument()
    expect(screen.queryByText(/hasn't revealed anything/)).not.toBeInTheDocument()
  })

  it('names a Non-Player Entity Reveal as such (SPL-UX-27)', () => {
    renderView(present([reveal('r1', 'A nervous clerk', { subjectType: 'NonPlayerEntity', handoutKind: null })]))

    expect(within(screen.getByRole('article')).getByText(/Non-Player Entity/)).toBeInTheDocument()
  })

  it('omits the location when there is none and names an unnamed Investigator', () => {
    renderView({ kind: 'present-player', reveals: [], title: 'X', location: '', investigatorsPresent: [{ name: null, isYours: true }] })

    expect(screen.queryByText('Location')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Revealed to Unnamed Investigator' })).toBeInTheDocument()
  })

  it('shows any other Player only the title and that the Scene is in progress, with no Reveals or Clues button (SPL-UX-35)', () => {
    const { container } = renderView({ kind: 'absent-player', title: 'The Corbitt House' })

    expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeInTheDocument()
    expect(screen.getByText("This Scene is in progress. You aren't taking part in it.")).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Investigators present' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('dl, ul, time')).toBeNull()
  })

  it('shows the Wall last for a present Player and passes it the Player role with the add callback (SPL-UX-49)', () => {
    const onWallEntryAdded = vi.fn()
    const headingRef = { current: null as HTMLHeadingElement | null }
    render(
      <SidePanelScopeProvider>
        <ActiveScenePlayerView campaignId="c1" scene={present()} headingRef={headingRef} onWallEntryAdded={onWallEntryAdded} />
      </SidePanelScopeProvider>,
    )

    const h1 = screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })
    const wall = screen.getByRole('region', { name: 'Wall' })
    expect(h1.compareDocumentPosition(wall) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(wallProps.current).toMatchObject({ campaignId: 'c1', viewerRole: 'Player', onWallEntryAdded })
  })

  it('shows the Wall to a Player who is not present, still without location or Investigator names (SPL-UX-49)', () => {
    renderView({ kind: 'absent-player', title: 'The Corbitt House' })

    const inProgress = screen.getByText("This Scene is in progress. You aren't taking part in it.")
    const wall = screen.getByRole('region', { name: 'Wall' })
    expect(inProgress.compareDocumentPosition(wall) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText('Arkham, Boston Road')).not.toBeInTheDocument()
  })
})
