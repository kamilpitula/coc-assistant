import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ItemSummary } from '@/scenario-preparation/types/Item'

import { ItemSummarySection } from './item-summary-section'

// specs/scenario-preparation/ux.md section 60; SP-UX-90.

const { mockUseList, refetch } = vi.hoisted(() => ({ mockUseList: vi.fn(), refetch: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useItems', () => ({ useItems: mockUseList }))

const item = (id: string): ItemSummary => ({ id, name: `Item ${id}`, sceneCount: 0 })

function show(items: ItemSummary[] | undefined, overrides: Record<string, unknown> = {}) {
  mockUseList.mockReturnValue({ data: items, isPending: false, isError: false, refetch, ...overrides })
}

describe('ItemSummarySection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is a section labelled by its heading with the count, "View all Items", and Create Item (SP-UX-90)', () => {
    show([item('1'), item('2'), item('3'), item('4')])

    render(<ItemSummarySection campaignId="c1" />)

    const section = screen.getByRole('region', { name: 'Items' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Items' })).toBeInTheDocument()
    expect(within(section).getByText('4 Items.')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'View all Items' })).toHaveAttribute('href', '/campaigns/c1/items')
    expect(within(section).getByRole('link', { name: 'Create Item' })).toHaveAttribute('href', '/campaigns/c1/items/new')
  })

  it('uses the singular for one Item', () => {
    show([item('1')])

    render(<ItemSummarySection campaignId="c1" />)

    expect(screen.getByText('1 Item.')).toBeInTheDocument()
  })

  it('says there are none and still offers Create, without a View all link (SP-UX-90)', () => {
    show([])

    render(<ItemSummarySection campaignId="c1" />)

    expect(screen.getByText('No Items yet.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View all Items' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Item' })).toBeInTheDocument()
  })

  it('asks for the list of the Campaign with the query enabled', () => {
    show([])

    render(<ItemSummarySection campaignId="c1" />)

    expect(mockUseList).toHaveBeenLastCalledWith('c1', true)
  })

  it('shows a busy skeleton while loading', () => {
    show(undefined, { isPending: true })

    const { container } = render(<ItemSummarySection campaignId="c1" />)

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('explains a failed load and retries', async () => {
    show(undefined, { isError: true })

    render(<ItemSummarySection campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load the Items.")).toBeInTheDocument()
    expect(refetch).toHaveBeenCalled()
  })
})
