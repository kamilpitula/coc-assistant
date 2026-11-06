import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Clue, Clues } from '@/scene-play/types/Reveal'

import { CluesPage } from './clues-page'

// specs/scene-play/ux.md section 15; SPL-UX-31 to SPL-UX-34, SPL-UX-37, SPL-A11Y-8, SPL-A11Y-11.
const { mockUseCampaign, mockUseMyClues, mockUseInvestigatorClues, mockUseOriginBackLink, mockUseMine, mockUseTheirs, refetch } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseMyClues: vi.fn(),
  mockUseInvestigatorClues: vi.fn(),
  mockUseOriginBackLink: vi.fn(),
  mockUseMine: vi.fn(),
  mockUseTheirs: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/campaign-play/hooks/useOriginBackLink', () => ({ useOriginBackLink: mockUseOriginBackLink }))
vi.mock('@/scene-play/hooks/useHeldItems', () => ({
  useMyHeldItems: mockUseMine,
  useInvestigatorHeldItems: mockUseTheirs,
  useTakeBackItem: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))
vi.mock('@/scene-play/hooks/useReveals', () => ({
  useMyClues: mockUseMyClues,
  useInvestigatorClues: mockUseInvestigatorClues,
  useRevealAnnouncement: () => ({ message: '', sequence: 0 }),
  useRevealFile: vi.fn(),
}))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const clue = (id: string, title: string, scene: { id: string; title: string }, revealedAt: string): Clue => ({
  revealId: id,
  revealedAt,
  subjectType: 'Handout',
  title,
  handoutKind: 'Text',
  content: { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [text(`Text of ${title}`)] }] } },
  file: null,
  imageDescription: null,
  scene,
})
const corbitt = { id: 's2', title: 'The Corbitt House' }
const knott = { id: 's1', title: 'Meeting Knott' }
const clues: Clues = {
  investigatorName: 'Harvey Walters',
  clues: [
    clue('r3', 'The cellar plan', corbitt, '2026-10-28T19:58:00Z'),
    clue('r2', 'The front door', corbitt, '2026-10-28T19:52:00Z'),
    clue('r1', 'A letter from Knott', knott, '2026-10-28T19:30:00Z'),
  ],
}
const query = (data: Clues | null | undefined, overrides: Record<string, unknown> = {}) => ({ data, isError: false, isFetchedAfterMount: true, refetch, ...overrides })

describe('CluesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { role: 'Player' } })
    mockUseOriginBackLink.mockReturnValue('The Corbitt House')
    mockUseMyClues.mockReturnValue(query(clues))
    mockUseInvestigatorClues.mockReturnValue(query(undefined))
    mockUseMine.mockReturnValue({ data: undefined, isError: false, isFetchedAfterMount: false, refetch })
    mockUseTheirs.mockReturnValue({ data: undefined, isError: false, isFetchedAfterMount: false, refetch })
  })

  it('titles the page "{name}\'s Clues" and groups the Clues by Scene, newest group first, each Clue closed (SPL-UX-31, SPL-A11Y-8)', () => {
    render(<CluesPage campaignId="c1" />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: "Harvey Walters's Clues" })).toBeInTheDocument()
    expect(screen.getByText('Everything Harvey Walters received from the Keeper, newest first.')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['The Corbitt House', 'Meeting Knott'])
    const group = within(screen.getByRole('region', { name: 'The Corbitt House' }))
    expect(group.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['The cellar plan', 'The front door'])
    expect(screen.queryByText('Text of The front door')).not.toBeInTheDocument()
  })

  it("shows the Investigator's Items above the Scene groups (SPL-UX-52)", () => {
    mockUseMine.mockReturnValue({
      data: {
        investigatorName: 'Harvey Walters',
        items: [
          {
            revealId: 'h1',
            name: "Walter Corbitt's diary",
            description: { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [text("Walter's last entry.")] }] } },
            givenAt: '2026-10-28T19:58:00Z',
          },
        ],
      },
      isError: false,
      isFetchedAfterMount: true,
      refetch,
    })
    render(<CluesPage campaignId="c1" />)

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'Items Harvey Walters holds',
      'The Corbitt House',
      'Meeting Knott',
    ])
  })

  it('shows a Clue after "Show" and hides it again after "Hide", named by its title (SPL-UX-31, SPL-A11Y-11)', async () => {
    render(<CluesPage campaignId="c1" />)

    const show = screen.getByRole('button', { name: 'Show The front door' })
    expect(show).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(show)
    expect(screen.getByText('Text of The front door')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide The front door' })).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Hide The front door' }))
    expect(screen.queryByText('Text of The front door')).not.toBeInTheDocument()
  })

  it('links back to the Campaign for a Player', () => {
    render(<CluesPage campaignId="c1" />)

    expect(screen.getByRole('link', { name: 'Back to your Campaign' })).toHaveAttribute('href', '/campaigns/c1')
  })

  it('links back to the Active Scene with ?from=active-scene for a Player (NAV-UX-7)', () => {
    render(<CluesPage campaignId="c1" from="active-scene" />)

    expect(screen.getByRole('link', { name: 'Back to The Corbitt House' })).toHaveAttribute('href', '/campaigns/c1/active-scene')
  })

  it('ignores an unknown from and links back to the Campaign (NAV-UX-8)', () => {
    render(<CluesPage campaignId="c1" from="wall" />)

    expect(screen.getByRole('link', { name: 'Back to your Campaign' })).toHaveAttribute('href', '/campaigns/c1')
  })

  it('says the Investigator has no Clues yet when there are none', () => {
    mockUseMyClues.mockReturnValue(query({ investigatorName: 'Harvey Walters', clues: [] }))
    render(<CluesPage campaignId="c1" />)

    expect(screen.getByText("Harvey Walters hasn't received any Clues yet.")).toBeInTheDocument()
  })

  it('tells a Player without an Approved Investigator so (SPL-UX-32)', () => {
    mockUseMyClues.mockReturnValue(query(null))
    render(<CluesPage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'No Clues to show' })).toBeInTheDocument()
    expect(screen.getByText("You don't have an Approved Investigator in this Campaign yet.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your Campaign' })).toBeInTheDocument()
  })

  it('links back to the Active Scene with ?from=active-scene when there is nothing to show (NAV-UX-7)', () => {
    mockUseMyClues.mockReturnValue(query(null))
    render(<CluesPage campaignId="c1" from="active-scene" />)

    expect(screen.getByRole('link', { name: 'Back to The Corbitt House' })).toHaveAttribute('href', '/campaigns/c1/active-scene')
  })

  it('shows a Skeleton while loading and "Try again" on a failure', async () => {
    mockUseMyClues.mockReturnValue(query(undefined))
    const { container, rerender } = render(<CluesPage campaignId="c1" />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    mockUseMyClues.mockReturnValue(query(undefined, { isError: true }))
    rerender(<CluesPage campaignId="c1" />)
    expect(screen.getByText("We couldn't load the Clues.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('fetches only what the role may read: a Player reads their own Clues, and nothing from the Keeper route (SPL-UX-34)', () => {
    render(<CluesPage campaignId="c1" investigatorId="i1" />)

    expect(screen.getByRole('heading', { name: "We couldn't find that Investigator" })).toBeInTheDocument()
    expect(mockUseInvestigatorClues).toHaveBeenCalledWith('c1', 'i1', false)
    expect(mockUseMyClues).toHaveBeenCalledWith('c1', false)
  })

  describe('as the Keeper', () => {
    beforeEach(() => {
      mockUseCampaign.mockReturnValue({ data: { role: 'Keeper' } })
      mockUseInvestigatorClues.mockReturnValue(query(clues))
      mockUseMyClues.mockReturnValue(query(undefined))
    })

    it('reads the Investigator\'s Clues and links back to the Investigator (SPL-UX-33)', () => {
      render(<CluesPage campaignId="c1" investigatorId="i1" />)

      expect(mockUseInvestigatorClues).toHaveBeenCalledWith('c1', 'i1', true)
      expect(screen.getByRole('heading', { level: 1, name: "Harvey Walters's Clues" })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Back to Harvey Walters' })).toHaveAttribute('href', '/campaigns/c1/investigators/i1')
    })

    it('links back to the Active Scene with ?from=active-scene for the Keeper (NAV-UX-7)', () => {
      render(<CluesPage campaignId="c1" investigatorId="i1" from="active-scene" />)

      expect(screen.getByRole('link', { name: 'Back to The Corbitt House' })).toHaveAttribute('href', '/campaigns/c1/active-scene')
    })

    it('shows investigator-not-found for an unknown or unapproved Investigator', () => {
      mockUseInvestigatorClues.mockReturnValue(query(null))
      render(<CluesPage campaignId="c1" investigatorId="i1" />)

      expect(screen.getByRole('heading', { name: "We couldn't find that Investigator" })).toBeInTheDocument()
    })

    it('shows investigator-not-found on the Player route, without reading any Clues', () => {
      render(<CluesPage campaignId="c1" />)

      expect(screen.getByRole('heading', { name: "We couldn't find that Investigator" })).toBeInTheDocument()
      expect(mockUseMyClues).toHaveBeenCalledWith('c1', false)
    })
  })
})
