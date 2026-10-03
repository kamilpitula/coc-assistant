import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { InvestigatorListItem } from '@/campaign-play/types/Investigator'

import { InvestigatorList } from './investigator-list'

const { mockUseList } = vi.hoisted(() => ({ mockUseList: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useKeeperInvestigators', () => ({ useInvestigatorList: mockUseList }))

function withRows(data: InvestigatorListItem[] | undefined, overrides: Record<string, unknown> = {}) {
  mockUseList.mockReturnValue({ data, isPending: false, isError: false, refetch: vi.fn(), ...overrides })
}

const submitted: InvestigatorListItem = {
  playerAccountId: 'p1',
  playerName: 'Ada Lovelace',
  status: 'Submitted',
  investigatorId: 'i1',
  investigatorName: 'Harvey Walters',
  updatedAt: '2026-10-02T10:00:00Z',
}

const draft: InvestigatorListItem = {
  playerAccountId: 'p2',
  playerName: 'Charles Babbage',
  status: 'Draft',
  investigatorId: null,
  investigatorName: null,
  updatedAt: '2026-10-01T10:00:00Z',
}

/** specs/character-sheet/ux.md section 3.1 "Investigators"; UX-3 and UX-13. */
describe('InvestigatorList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is a section headed "Investigators" with a table of Player, Investigator, Status, and Action', () => {
    withRows([submitted])

    render(<InvestigatorList campaignId="c1" />)

    const section = screen.getByRole('region', { name: 'Investigators' })
    const table = within(section).getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Player',
      'Investigator',
      'Status',
      'Action',
    ])
  })

  it('UX-13: lists Submitted Investigators first with "Review", and In progress rows without an action or name', () => {
    withRows([draft, submitted])

    render(<InvestigatorList campaignId="c1" />)

    const table = screen.getByRole('table')
    const [, first, second] = within(table).getAllByRole('row')
    expect(within(first).getByText('Ada Lovelace')).toBeInTheDocument()
    expect(within(first).getByRole('link', { name: 'Review Harvey Walters' })).toHaveAttribute('href', '/campaigns/c1/investigators/i1')
    expect(within(second).getByText('Charles Babbage')).toBeInTheDocument()
    expect(within(second).getByText('In progress')).toBeInTheDocument()
    expect(within(second).getByText('Not shown until submitted')).toBeInTheDocument()
    expect(within(second).queryByRole('link')).not.toBeInTheDocument()
  })

  it('offers "View" for Changes Requested and Approved Investigators', () => {
    withRows([{ ...submitted, status: 'Approved' }])

    render(<InvestigatorList campaignId="c1" />)

    expect(within(screen.getByRole('table')).getByRole('link', { name: 'View Harvey Walters' })).toBeInTheDocument()
  })

  it('says when there are no Investigators yet', () => {
    withRows([])

    render(<InvestigatorList campaignId="c1" />)

    expect(screen.getByText('No Investigators yet. Players create theirs after joining.')).toBeInTheDocument()
  })

  it('says when the list cannot be loaded', () => {
    withRows(undefined, { isError: true })

    render(<InvestigatorList campaignId="c1" />)

    expect(screen.getByText("We couldn't load the Investigators.")).toBeInTheDocument()
  })
})
