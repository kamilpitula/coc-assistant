import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Clue, Clues } from '@/scene-play/types/Reveal'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { routerState } from '@/shared/test-support/routerMock'

import { CluesPanel } from './clues-panel'

// specs/navigation/ux.md section 3 (refinements G2, G4-G7): the Clues panel reads through useCluesRead with role gating,
// shows the kind label until ready, and links to the full page with ?from=active-scene.
const { mockUseCampaign, mockUseMyClues, mockUseInvestigatorClues, mockUseMine, mockUseTheirs, refetch } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseMyClues: vi.fn(),
  mockUseInvestigatorClues: vi.fn(),
  mockUseMine: vi.fn(),
  mockUseTheirs: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
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
const clues: Clues = {
  investigatorName: 'Lucy Ward',
  clues: [clue('r2', 'The front door', corbitt, '2026-10-28T19:52:00Z')],
}
const query = (data: Clues | null | undefined, overrides: Record<string, unknown> = {}) => ({ data, isError: false, isFetchedAfterMount: true, refetch, ...overrides })

function show(props: { investigatorId?: string } = {}) {
  return render(
    <SidePanelScopeProvider>
      <CluesPanel campaignId="c1" {...props} />
    </SidePanelScopeProvider>,
  )
}

describe('CluesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseCampaign.mockReturnValue({ data: { role: 'Keeper' } })
    mockUseMyClues.mockReturnValue(query(undefined))
    mockUseInvestigatorClues.mockReturnValue(query(clues))
    mockUseMine.mockReturnValue({ data: undefined, isError: false, isFetchedAfterMount: false, refetch })
    mockUseTheirs.mockReturnValue({ data: undefined, isError: false, isFetchedAfterMount: false, refetch })
  })

  it('shows the kind line, the title, the h3 group with an h4 Clue, and the full-page link for the Keeper (NAV-UX-4, NAV-UX-7)', () => {
    show({ investigatorId: 'i1' })

    expect(screen.getByText('Clues')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: "Lucy Ward's Clues" })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'The Corbitt House' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'The front door' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/investigators/i1/clues?from=active-scene')
  })

  it('shows the Investigator\'s Items above the Clues, one level deeper (SPL-UX-52)', () => {
    mockUseTheirs.mockReturnValue({
      data: {
        investigatorName: 'Lucy Ward',
        items: [
          {
            revealId: 'h1',
            itemId: 'k1',
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
    show({ investigatorId: 'i1' })

    expect(screen.getByRole('heading', { level: 3, name: 'Items Lucy Ward holds' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Take back Walter Corbitt's diary" })).toBeInTheDocument()
  })

  it('links to the Player Clues page with ?from=active-scene for a Player (NAV-UX-7)', () => {
    mockUseCampaign.mockReturnValue({ data: { role: 'Player' } })
    mockUseMyClues.mockReturnValue(query({ investigatorName: 'Harvey Walters', clues: [] }))
    show()

    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/investigator/clues?from=active-scene')
    expect(screen.getByText("Harvey Walters hasn't received any Clues yet.")).toBeInTheDocument()
  })

  it('says the subject was not found for an unknown Investigator, with no footer (NAV-UX-9)', () => {
    mockUseInvestigatorClues.mockReturnValue(query(null))
    show({ investigatorId: 'unknown' })

    expect(screen.getByRole('heading', { level: 2, name: 'Clues' })).toBeInTheDocument()
    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
  })

  it('says the subject was not found for a Player without an Approved Investigator (NAV-UX-9)', () => {
    mockUseCampaign.mockReturnValue({ data: { role: 'Player' } })
    mockUseMyClues.mockReturnValue(query(null))
    show()

    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
  })

  it('says the subject was not found on the wrong role, and reads no Clues (NAV-UX-9)', () => {
    mockUseCampaign.mockReturnValue({ data: { role: 'Player' } })
    show({ investigatorId: 'i1' })

    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(mockUseMyClues).toHaveBeenCalledWith('c1', false)
    expect(mockUseInvestigatorClues).toHaveBeenCalledWith('c1', 'i1', false)
  })

  it('shows the kind label, a Skeleton while loading, and retries on a failure', async () => {
    mockUseInvestigatorClues.mockReturnValue(query(undefined))
    const { rerender } = show({ investigatorId: 'i1' })
    expect(screen.getByRole('heading', { level: 2, name: 'Clues' })).toBeInTheDocument()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()

    mockUseInvestigatorClues.mockReturnValue(query(undefined, { isError: true }))
    rerender(
      <SidePanelScopeProvider>
        <CluesPanel campaignId="c1" investigatorId="i1" />
      </SidePanelScopeProvider>,
    )
    expect(screen.getByText("We couldn't load this.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('announces nothing of its own in the panel (G7)', () => {
    show({ investigatorId: 'i1' })

    expect(within(document.body).queryByRole('status')).not.toBeInTheDocument()
  })
})
