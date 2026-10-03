import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CampaignLiveConnectionContext,
  type CampaignLiveConnectionValue,
} from '@/campaign-play/providers/campaignLiveConnectionContext'
import type { CampaignPresenceState } from '@/campaign-play/state/campaignPresenceState'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'

import { CampaignTable } from './campaign-table'

// specs/campaign-overview/ux.md section 5 (CO-UX-7 to CO-UX-9, CO-A11Y-3 to CO-A11Y-5), with the Presence summary,
// notice, and announcements of specs/campaign-play/ux.md sections 2-7 (PR-UX-1, PR-UX-5 to PR-UX-9, PR-A11Y-4 to 6).

const { mockGetMembers } = vi.hoisted(() => ({ mockGetMembers: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))
vi.mock('@/campaign-play/services/campaignApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/campaign-play/services/campaignApi')>()),
  getCampaignMembers: mockGetMembers,
}))
vi.mock('@/campaign-play/components/invite-dialog/invite-dialog', () => ({
  InvitePlayersDialog: () => <button type="button">Invite Players</button>,
}))

const keeper: CampaignMember = { memberId: 'k', displayName: 'Eleanor Hart', role: 'Keeper', isYou: false, investigator: null }
const you: CampaignMember = {
  memberId: 'y',
  displayName: 'Sam Okafor',
  role: 'Player',
  isYou: true,
  investigator: { visibility: 'Visible', name: 'Dr. Ames', status: 'Submitted' },
}
const alex: CampaignMember = { memberId: 'a', displayName: 'Alex Brandt', role: 'Player', isYou: false, investigator: { visibility: 'NotReady' } }

const retry = vi.fn()

function liveValue(
  connection: CampaignPresenceState['connection'],
  presenceByMember: CampaignPresenceState['presenceByMember'],
): CampaignLiveConnectionValue {
  return { connection, presence: { connection, presenceByMember }, retry }
}

function setup(initial: CampaignLiveConnectionValue) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrap = (value: CampaignLiveConnectionValue, children: ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <CampaignLiveConnectionContext.Provider value={value}>{children}</CampaignLiveConnectionContext.Provider>
    </QueryClientProvider>
  )
  const view = render(wrap(initial, <CampaignTable campaignId="c1" />))
  return {
    queryClient,
    update: (value: CampaignLiveConnectionValue) => view.rerender(wrap(value, <CampaignTable campaignId="c1" />)),
  }
}

/** The table body rows as their cell texts: Member, Presence, Investigator, Status, Action. */
function tableRows(): string[][] {
  const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
  return rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent ?? ''))
}

function rowOf(name: string): HTMLElement {
  return within(screen.getByRole('table')).getByRole('row', { name: new RegExp(name) })
}

describe('CampaignTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMembers.mockResolvedValue([keeper, you, alex])
  })

  it('lists every member once in the server order with Presence and the Investigator the Player may see (CO-UX-7, CO-UX-8)', async () => {
    setup(liveValue('connected', { k: 'Connected', y: 'Connected' }))

    expect(await screen.findByRole('region', { name: 'At the table' })).toBeInTheDocument()
    await waitFor(() =>
      expect(tableRows()).toEqual([
        ['Eleanor HartKeeper', 'Connected', '-None', '-None', ''],
        ['Sam Okafor (you)', 'Connected', 'Dr. Ames', 'Submitted - waiting for your Keeper', 'View Dr. Ames'],
        ['Alex Brandt', 'Not connected', 'Not ready yet', '-None', ''],
      ]),
    )
    expect(screen.getByText('2 of 3 connected')).toBeInTheDocument()
  })

  it('has column headers with a visually hidden Action header (CO-A11Y-3)', async () => {
    setup(liveValue('connected', {}))

    await waitFor(() => expect(tableRows()).toHaveLength(3))
    const headers = within(screen.getByRole('table')).getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual(['Member', 'Presence', 'Investigator', 'Status', 'Action'])
    expect(headers.every((header) => header.getAttribute('scope') === 'col')).toBe(true)
    expect(headers[4]).toHaveClass('sr-only')
  })

  it('also lists every member for narrow screens', async () => {
    setup(liveValue('connected', {}))

    await waitFor(() => expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3))
  })

  it('marks the own row with "(you)" and a muted background (CO-A11Y-5)', async () => {
    setup(liveValue('connected', {}))

    await waitFor(() => expect(tableRows()).toHaveLength(3))
    expect(rowOf('Sam Okafor')).toHaveClass('bg-muted')
    expect(rowOf('Alex Brandt')).not.toHaveClass('bg-muted')
  })

  it('gives the Keeper Review links and hides Draft names (CO-UX-9, CO-A11Y-4)', async () => {
    mockGetMembers.mockResolvedValue([
      { ...keeper, isYou: true },
      { memberId: 'p1', displayName: 'Ana Ruiz', role: 'Player', isYou: false, investigator: { visibility: 'Visible', id: 'i1', name: 'Dr. Ames', status: 'Submitted' } },
      { memberId: 'p2', displayName: 'Ben Cole', role: 'Player', isYou: false, investigator: { visibility: 'InProgress' } },
    ])
    setup(liveValue('connected', {}))

    await waitFor(() => expect(tableRows()).toHaveLength(3))
    expect(within(rowOf('Ana Ruiz')).getByRole('link', { name: 'Review Dr. Ames' })).toHaveAttribute(
      'href',
      '/campaigns/c1/investigators/i1',
    )
    expect(tableRows()[2]).toEqual(['Ben Cole', 'Not connected', 'Not shown until submitted', 'In progress', ''])
  })

  it('offers "Invite Players" to the Keeper only, and no longer shows the empty hint', async () => {
    mockGetMembers.mockResolvedValue([{ ...keeper, isYou: true }])
    setup(liveValue('connected', { k: 'Connected' }))

    expect(await screen.findByRole('button', { name: 'Invite Players' })).toBeInTheDocument()
    expect(screen.queryByText(/No Players yet/)).not.toBeInTheDocument()
  })

  it('never offers "Invite Players" to a Player', async () => {
    setup(liveValue('connected', {}))

    await waitFor(() => expect(tableRows()).toHaveLength(3))
    expect(screen.queryByRole('button', { name: 'Invite Players' })).not.toBeInTheDocument()
  })

  it('shows every member as Unknown before the first snapshot (PR-UX-7)', async () => {
    setup(liveValue('connecting', null))

    await waitFor(() => expect(tableRows().map((row) => row[1])).toEqual(['Unknown', 'Unknown', 'Unknown']))
    expect(screen.getAllByText("Checking who's connected...")).toHaveLength(1)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('keeps every row in place when Presence changes (PR-UX-6)', async () => {
    const { update } = setup(liveValue('connected', { k: 'Connected', y: 'Connected' }))
    await waitFor(() => expect(tableRows()).toHaveLength(3))

    update(liveValue('connected', { k: 'NotConnected', y: 'Connected', a: 'Connected' }))

    expect(tableRows().map((row) => [row[0], row[1]])).toEqual([
      ['Eleanor HartKeeper', 'Not connected'],
      ['Sam Okafor (you)', 'Connected'],
      ['Alex Brandt', 'Connected'],
    ])
  })

  it('shows the reconnecting notice when your connection drops (PR-UX-8, PR-A11Y-5)', async () => {
    setup(liveValue('reconnecting', null))

    expect(await screen.findByRole('status')).toHaveTextContent(
      "Connection lost. Reconnecting... Who's at the table may be out of date.",
    )
  })

  it('offers Try again once reconnecting fails, then moves focus to the heading (PR-UX-9, PR-A11Y-6)', async () => {
    const user = userEvent.setup()
    const { update } = setup(liveValue('failed', null))

    expect(await screen.findByRole('status')).toHaveTextContent("Couldn't reconnect.")
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalled()

    update(liveValue('reconnecting', null))

    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'At the table' })).toHaveFocus()
  })

  it('shows the heading, the checking line, and placeholder rows while the roster loads', () => {
    mockGetMembers.mockReturnValue(new Promise(() => {}))
    setup(liveValue('connected', { k: 'Connected' }))

    expect(screen.getByRole('heading', { name: 'At the table' })).toBeInTheDocument()
    expect(screen.getByText("Checking who's connected...")).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'At the table' }).querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('offers to try again when the roster cannot be loaded', async () => {
    const user = userEvent.setup()
    mockGetMembers.mockRejectedValueOnce(new Error('offline'))
    setup(liveValue('connected', { k: 'Connected' }))

    expect(await screen.findByText("We couldn't load who's at the table.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(tableRows()).toHaveLength(3))
  })

  it('renders nothing for someone who is not a member', async () => {
    mockGetMembers.mockResolvedValue(null)
    setup(liveValue('connected', {}))

    await waitFor(() => expect(screen.queryByRole('region', { name: 'At the table' })).not.toBeInTheDocument())
  })

  it('announces member changes politely but not the first snapshot (PR-A11Y-4)', async () => {
    const { update } = setup(liveValue('connecting', null))
    await waitFor(() => expect(tableRows()).toHaveLength(3))
    const liveRegion = document.querySelector('[aria-live="polite"]')!

    update(liveValue('connected', { k: 'Connected', y: 'Connected' }))
    expect(liveRegion).toHaveTextContent('')

    update(liveValue('connected', { k: 'Connected', y: 'Connected', a: 'Connected' }))
    expect(liveRegion).toHaveTextContent('Alex Brandt connected.')
  })

  it('announces a Player who joins after the roster refetch (PR-UX-5)', async () => {
    const { queryClient } = setup(liveValue('connected', { k: 'Connected', y: 'Connected' }))
    await waitFor(() => expect(tableRows()).toHaveLength(3))
    mockGetMembers.mockResolvedValue([
      keeper,
      you,
      alex,
      { memberId: 'p', displayName: 'Priya Nair', role: 'Player', isYou: false, investigator: null },
    ])

    await act(() => queryClient.invalidateQueries())

    await waitFor(() => expect(tableRows()).toHaveLength(4))
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Priya Nair joined the Campaign.')
  })
})
