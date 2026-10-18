import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { routerState } from '@/shared/test-support/routerMock'
import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'

import { NonPlayerEntityListPage } from './non-player-entity-list-page'

// specs/scenario-preparation/ux.md section 23; SP-UX-29, SP-UX-30, SP-A11Y-18, SP-A11Y-23.

const { mockUseCampaign, mockUseList, refetch } = vi.hoisted(() => ({ mockUseCampaign: vi.fn(), mockUseList: vi.fn(), refetch: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntities', () => ({ useNonPlayerEntities: mockUseList }))

const knott: NonPlayerEntitySummary = { id: 'h1', type: 'HumanNpc', name: 'Mr. Knott' }
const ghoul: NonPlayerEntitySummary = { id: 'm1', type: 'MythosCreature', name: 'Ghoul' }
const sergeant: NonPlayerEntitySummary = { id: 'h2', type: 'HumanNpc', name: 'Desk sergeant' }

function show(items: NonPlayerEntitySummary[] | undefined, overrides: Record<string, unknown> = {}) {
  mockUseList.mockReturnValue({ data: items, isPending: false, isError: false, refetch, ...overrides })
}

// The table (from 640px) and the list (below it) both render; the tests read the table.
const tableNames = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))

describe('NonPlayerEntityListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
  })

  afterEach(() => vi.useRealTimers())

  it('has one h1, a Back link, Create, and lists every entity by name with its type (SP-UX-29, SP-A11Y-18)', () => {
    show([knott, ghoul, sergeant])

    render(<NonPlayerEntityListPage campaignId="c1" />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Non-Player Entities' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the Overview' })).toHaveAttribute('href', '/campaigns/c1')
    expect(screen.getByRole('link', { name: 'Create Non-Player Entity' })).toHaveAttribute('href', '/campaigns/c1/non-player-entities/new')
    expect(tableNames()).toEqual([
      ['Desk sergeant', 'Human NPC'],
      ['Ghoul', 'Mythos Creature'],
      ['Mr. Knott', 'Human NPC'],
    ])
  })

  it('links a Human NPC to its profile page', () => {
    show([knott])

    render(<NonPlayerEntityListPage campaignId="c1" />)

    expect(within(screen.getByRole('table')).getByRole('link', { name: 'Mr. Knott' })).toHaveAttribute('href', '/campaigns/c1/human-npcs/h1')
  })

  it('links a Mythos Creature to its profile page (SP-UX-29)', () => {
    show([ghoul])

    render(<NonPlayerEntityListPage campaignId="c1" />)

    expect(within(screen.getByRole('table')).getByRole('link', { name: 'Ghoul' })).toHaveAttribute('href', '/campaigns/c1/mythos-creatures/m1')
  })

  it('narrows by search text and announces the count after a pause, not on first load (SP-UX-30, SP-A11Y-23)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    show([knott, ghoul, sergeant])
    render(<NonPlayerEntityListPage campaignId="c1" />)
    const count = () => document.querySelector('[aria-live="polite"]')
    expect(count()).toBeEmptyDOMElement()

    await userEvent.type(screen.getByLabelText('Search by name'), 'kno')

    expect(tableNames()).toEqual([['Mr. Knott', 'Human NPC']])
    expect(count()).toBeEmptyDOMElement()
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(count()).toHaveTextContent('1 shown.')
  })

  it('narrows by type in a Type fieldset', async () => {
    show([knott, ghoul, sergeant])
    render(<NonPlayerEntityListPage campaignId="c1" />)

    expect(screen.getByRole('group', { name: 'Type' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'Mythos Creatures' }))

    expect(tableNames()).toEqual([['Ghoul', 'Mythos Creature']])
  })

  it('offers Clear filters when nothing matches, restores the list, and focuses the search field', async () => {
    show([knott, ghoul])
    render(<NonPlayerEntityListPage campaignId="c1" />)

    await userEvent.type(screen.getByLabelText('Search by name'), 'zzz')
    expect(screen.getByText('No Non-Player Entities match these filters.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(tableNames()).toHaveLength(2)
    expect(screen.getByLabelText('Search by name')).toHaveFocus()
    expect(screen.getByLabelText('Search by name')).toHaveValue('')
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
  })

  it('says there are none for an empty Campaign and shows neither search nor filter', () => {
    show([])

    render(<NonPlayerEntityListPage campaignId="c1" />)

    expect(screen.getByText('No Non-Player Entities yet.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Search by name')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Type' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Non-Player Entity' })).toBeInTheDocument()
  })

  it('shows a busy skeleton, and explains a failed load with Try again', async () => {
    show(undefined, { isPending: true })
    const { container, rerender } = render(<NonPlayerEntityListPage campaignId="c1" />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    show(undefined, { isError: true })
    rerender(<NonPlayerEntityListPage campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load the Non-Player Entities.")).toBeInTheDocument()
    expect(refetch).toHaveBeenCalled()
  })

  it('announces the status message of the page that navigated here, such as a deletion (SP-UX-37)', () => {
    routerState.location.state = { statusMessage: 'Mr. Knott deleted.' }
    show([ghoul])

    render(<NonPlayerEntityListPage campaignId="c1" />)

    expect(screen.getByRole('status')).toHaveTextContent('Mr. Knott deleted.')
    routerState.location.state = {}
  })

  it('shows a Player the not-found page and never enables the list query (SP-UX-39)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    show(undefined, { isPending: true })

    render(<NonPlayerEntityListPage campaignId="c1" />)

    expect(screen.getByRole('heading', { name: "We couldn't find that Non-Player Entity" })).toBeInTheDocument()
    expect(mockUseList).toHaveBeenCalledWith('c1', false)
  })
})
