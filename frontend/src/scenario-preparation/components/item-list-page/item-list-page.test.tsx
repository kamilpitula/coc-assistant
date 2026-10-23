import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ItemSummary } from '@/scenario-preparation/types/Item'
import { routerState } from '@/shared/test-support/routerMock'

import { ItemListPage } from './item-list-page'

// specs/scenario-preparation/ux.md section 61; SP-UX-91, SP-UX-95, SP-UX-102, SP-A11Y-51, SP-A11Y-53, SP-A11Y-57.

const { mockUseCampaign, mockUseList, refetch } = vi.hoisted(() => ({ mockUseCampaign: vi.fn(), mockUseList: vi.fn(), refetch: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scenario-preparation/hooks/useItems', () => ({ useItems: mockUseList }))

const diary: ItemSummary = { id: 'k1', name: "Walter Corbitt's diary", sceneCount: 2 }
const key: ItemSummary = { id: 'k2', name: 'The cellar key', sceneCount: 0 }
const lamp: ItemSummary = { id: 'k3', name: 'Oil lamp', sceneCount: 1 }

function show(items: ItemSummary[] | undefined, overrides: Record<string, unknown> = {}) {
  mockUseList.mockReturnValue({ data: items, isPending: false, isError: false, refetch, ...overrides })
}

// The table (from 640px) and the list (below it) both render; the tests read the table or the list on purpose.
const tableRows = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))

describe('ItemListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
  })

  afterEach(() => vi.useRealTimers())

  it('has one h1, a Back link, Create Item, and lists every Item by name with its Scene count (SP-UX-91, SP-A11Y-51)', () => {
    show([diary, key, lamp])

    render(<ItemListPage campaignId="c1" />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Items' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the Overview' })).toHaveAttribute('href', '/campaigns/c1')
    expect(screen.getByRole('link', { name: 'Create Item' })).toHaveAttribute('href', '/campaigns/c1/items/new')
    expect(within(screen.getByRole('table')).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Name', 'Scenes'])
    expect(tableRows()).toEqual([
      ['Oil lamp', '1'],
      ['The cellar key', '0'],
      ["Walter Corbitt's diary", '2'],
    ])
  })

  it('links each name to the Item page (SP-UX-91)', () => {
    show([diary])

    render(<ItemListPage campaignId="c1" />)

    expect(within(screen.getByRole('table')).getByRole('link', { name: "Walter Corbitt's diary" })).toHaveAttribute('href', '/campaigns/c1/items/k1')
  })

  it('shows a list below 640px with how many Scenes link each Item (SP-UX-91, SP-A11Y-57)', () => {
    show([diary, key, lamp])

    render(<ItemListPage campaignId="c1" />)

    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    const texts = items.map((item) => item.textContent)
    expect(texts).toContain("Walter Corbitt's diaryLinked to 2 Scenes")
    expect(texts).toContain('The cellar keyNot linked to a Scene')
    expect(texts).toContain('Oil lampLinked to 1 Scene')
  })

  it('narrows by search text, case- and accent-insensitively, and announces the count after a pause, not on first load (SP-UX-91, SP-A11Y-53)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    show([diary, key, lamp])
    render(<ItemListPage campaignId="c1" />)
    const count = () => document.querySelector('[aria-live="polite"]')
    expect(count()).toBeEmptyDOMElement()

    await userEvent.type(screen.getByLabelText('Search by name'), 'CELLAR')

    expect(tableRows()).toEqual([['The cellar key', '0']])
    expect(count()).toBeEmptyDOMElement()
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(count()).toHaveTextContent('1 shown.')
  })

  it('offers Clear search when nothing matches, restores the list, and focuses the search field (SP-UX-91)', async () => {
    show([diary, key])
    render(<ItemListPage campaignId="c1" />)

    await userEvent.type(screen.getByLabelText('Search by name'), 'zzz')
    expect(screen.getByText('No Items match this search.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(tableRows()).toHaveLength(2)
    expect(screen.getByLabelText('Search by name')).toHaveFocus()
    expect(screen.getByLabelText('Search by name')).toHaveValue('')
  })

  it('starts every visit with an empty search (SP-UX-91)', () => {
    show([diary, key])

    render(<ItemListPage campaignId="c1" />)

    expect(screen.getByLabelText('Search by name')).toHaveValue('')
  })

  it('says there are none for an empty Campaign, offers Create Item, and shows no search', () => {
    show([])

    render(<ItemListPage campaignId="c1" />)

    expect(screen.getByText('No Items yet.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Search by name')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Item' })).toBeInTheDocument()
  })

  it('shows a busy skeleton, and explains a failed load with Try again', async () => {
    show(undefined, { isPending: true })
    const { container, rerender } = render(<ItemListPage campaignId="c1" />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    show(undefined, { isError: true })
    rerender(<ItemListPage campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load the Items.")).toBeInTheDocument()
    expect(refetch).toHaveBeenCalled()
  })

  it('announces the status message of the page that navigated here, such as a deletion (SP-UX-95)', () => {
    routerState.location.state = { statusMessage: "Walter Corbitt's diary deleted." }
    show([key])

    render(<ItemListPage campaignId="c1" />)

    expect(screen.getByRole('status')).toHaveTextContent("Walter Corbitt's diary deleted.")
    routerState.location.state = {}
  })

  it('shows a Player the not-found page and never enables the list query (SP-UX-102)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    show(undefined, { isPending: true })

    render(<ItemListPage campaignId="c1" />)

    expect(screen.getByRole('heading', { name: "We couldn't find that Item" })).toBeInTheDocument()
    expect(mockUseList).toHaveBeenCalledWith('c1', false)
  })
})
