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

import { CampaignPresence } from './campaign-presence'

// specs/campaign-play/ux.md sections 2-7; PR-UX-1, PR-UX-6 to PR-UX-11; PR-A11Y-1, PR-A11Y-4 to PR-A11Y-6.

const { mockGetMembers } = vi.hoisted(() => ({ mockGetMembers: vi.fn() }))

vi.mock('@/shared/hooks/useAccessToken', () => ({ useAccessToken: () => async () => 'token' }))

vi.mock('@/campaign-play/services/campaignApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/campaign-play/services/campaignApi')>()),
  getCampaignMembers: mockGetMembers,
}))

const keeper: CampaignMember = { memberId: 'k', displayName: 'Eleanor Hart', role: 'Keeper', isYou: false }
const you: CampaignMember = { memberId: 'y', displayName: 'Sam Okafor', role: 'Player', isYou: true }
const alex: CampaignMember = { memberId: 'a', displayName: 'Alex Brandt', role: 'Player', isYou: false }

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
  const view = render(wrap(initial, <CampaignPresence campaignId="c1" />))
  return {
    queryClient,
    update: (value: CampaignLiveConnectionValue) => view.rerender(wrap(value, <CampaignPresence campaignId="c1" />)),
  }
}

function rowTexts(): string[] {
  return within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent ?? '')
}

describe('CampaignPresence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMembers.mockResolvedValue([keeper, you, alex])
  })

  it('lists every member in the server order with "(you)" and the Keeper label (PR-UX-1, PR-UX-11, PR-A11Y-1)', async () => {
    setup(liveValue('connected', { k: 'Connected', y: 'Connected' }))

    expect(await screen.findByRole('region', { name: 'At the table' })).toBeInTheDocument()
    await waitFor(() =>
      expect(rowTexts()).toEqual([
        'Eleanor HartKeeperConnected',
        'Sam Okafor (you)Connected',
        'Alex BrandtNot connected',
      ]),
    )
    expect(screen.getByText('2 of 3 connected')).toBeInTheDocument()
  })

  it('shows every member as Unknown before the first snapshot (PR-UX-7)', async () => {
    setup(liveValue('connecting', null))

    await waitFor(() => expect(rowTexts()).toEqual(['Eleanor HartKeeperUnknown', 'Sam Okafor (you)Unknown', 'Alex BrandtUnknown']))
    expect(screen.getByText("Checking who's connected...")).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders Unknown names in the muted colour without opacity (ux.md section 3)', async () => {
    setup(liveValue('connecting', null))

    const name = await screen.findByText('Alex Brandt')
    expect(name).toHaveClass('text-muted-foreground')
    expect(name.className).not.toMatch(/opacity/)
  })

  it('keeps every row in place when Presence changes (PR-UX-6)', async () => {
    const { update } = setup(liveValue('connected', { k: 'Connected', y: 'Connected' }))
    await waitFor(() => expect(rowTexts()).toHaveLength(3))

    update(liveValue('connected', { k: 'NotConnected', y: 'Connected', a: 'Connected' }))

    expect(rowTexts()).toEqual(['Eleanor HartKeeperNot connected', 'Sam Okafor (you)Connected', 'Alex BrandtConnected'])
    expect(screen.getByText('2 of 3 connected')).toBeInTheDocument()
  })

  it('shows the reconnecting notice and Unknown when your connection drops (PR-UX-8, PR-A11Y-5)', async () => {
    setup(liveValue('reconnecting', null))

    expect(await screen.findByRole('status')).toHaveTextContent(
      "Connection lost. Reconnecting... Who's at the table may be out of date.",
    )
    await waitFor(() => expect(rowTexts().every((row) => row.endsWith('Unknown'))).toBe(true))
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

  it('prompts a Keeper without Players to share the Invite (PR-UX-10)', async () => {
    mockGetMembers.mockResolvedValue([{ ...keeper, isYou: true }])
    setup(liveValue('connected', { k: 'Connected' }))

    expect(await screen.findByText('No Players yet. Share the Invite to bring them in.')).toBeInTheDocument()
    expect(screen.getByText('1 of 1 connected')).toBeInTheDocument()
  })

  it('never shows the Invite hint to a Player (PR-UX-10)', async () => {
    setup(liveValue('connected', { k: 'Connected' }))

    await waitFor(() => expect(rowTexts()).toHaveLength(3))
    expect(screen.queryByText(/No Players yet/)).not.toBeInTheDocument()
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

    await waitFor(() => expect(rowTexts()).toHaveLength(3))
  })

  it('announces member changes politely but not the first snapshot (PR-A11Y-4)', async () => {
    const { update } = setup(liveValue('connecting', null))
    await waitFor(() => expect(rowTexts()).toHaveLength(3))
    const liveRegion = document.querySelector('[aria-live="polite"]')!

    update(liveValue('connected', { k: 'Connected', y: 'Connected' }))
    expect(liveRegion).toHaveTextContent('')

    update(liveValue('connected', { k: 'Connected', y: 'Connected', a: 'Connected' }))
    expect(liveRegion).toHaveTextContent('Alex Brandt connected.')
  })

  it('announces a Player who joins after the roster refetch (PR-UX-5)', async () => {
    const { queryClient } = setup(liveValue('connected', { k: 'Connected', y: 'Connected' }))
    await waitFor(() => expect(rowTexts()).toHaveLength(3))
    mockGetMembers.mockResolvedValue([keeper, you, alex, { memberId: 'p', displayName: 'Priya Nair', role: 'Player', isYou: false }])

    await act(() => queryClient.invalidateQueries())

    await waitFor(() => expect(rowTexts()).toHaveLength(4))
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Priya Nair joined the Campaign.')
  })
})
