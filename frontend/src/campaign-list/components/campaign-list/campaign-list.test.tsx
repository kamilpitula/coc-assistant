import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { keeperListItem, playerListItem } from '@/campaign-list/test-support/campaignListFixtures'

import { CampaignList } from './campaign-list'

// specs/campaign-list/ux.md sections 2 and 4 (CL-UX-1, 2, 6, 10, 11; CL-A11Y-1, 2, 7, 9).

const { mockUseCampaignList, mockRefetch } = vi.hoisted(() => ({ mockUseCampaignList: vi.fn(), mockRefetch: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-list/hooks/useCampaignList', () => ({ useCampaignList: mockUseCampaignList }))

function query(overrides: Record<string, unknown>) {
  return { data: undefined, isPending: false, isError: false, isSuccess: false, isFetching: false, refetch: mockRefetch, ...overrides }
}

function loaded(data: unknown, overrides: Record<string, unknown> = {}) {
  return query({ data, isSuccess: true, ...overrides })
}

const olderKeeperItem = { ...keeperListItem, id: 'c0', name: 'Masks of Nyarlathotep' }

describe('CampaignList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the page heading and a New campaign link, and no create form (CL-UX-1)', () => {
    mockUseCampaignList.mockReturnValue(loaded([keeperListItem]))

    render(<CampaignList />)

    expect(screen.getByRole('heading', { level: 1, name: 'Your campaigns' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New campaign' })).toHaveAttribute('href', '/campaigns/new')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('lists Keeper Campaigns under "You run" before Player Campaigns under "You play in", in server order (CL-UX-2)', () => {
    mockUseCampaignList.mockReturnValue(loaded([keeperListItem, olderKeeperItem, playerListItem]))

    render(<CampaignList />)

    const sections = screen.getAllByRole('region')
    expect(sections.map((section) => within(section).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'You run',
      'You play in',
    ])
    const run = screen.getByRole('region', { name: 'You run' })
    expect(within(within(run).getByRole('list')).getAllByRole('listitem')).toHaveLength(2)
    expect(within(run).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'The Haunting',
      'Masks of Nyarlathotep',
    ])
    const play = screen.getByRole('region', { name: 'You play in' })
    expect(within(play).getByRole('link', { name: 'Horror on the Orient Express' })).toBeInTheDocument()
  })

  it('does not render a section without Campaigns (CL-UX-2)', () => {
    mockUseCampaignList.mockReturnValue(loaded([playerListItem]))

    render(<CampaignList />)

    expect(screen.queryByRole('region', { name: 'You run' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'You play in' })).toBeInTheDocument()
  })

  it('explains how to start when the Account has no Campaigns (CL-UX-6)', () => {
    mockUseCampaignList.mockReturnValue(loaded([]))

    render(<CampaignList />)

    const empty = screen.getByRole('region', { name: 'No campaigns yet' })
    expect(
      within(empty).getByText(
        'To join a Campaign, open the invite link your Keeper sent you. To run your own, start a new one.',
      ),
    ).toBeInTheDocument()
    expect(within(empty).getByRole('link', { name: 'New campaign' })).toHaveAttribute('href', '/campaigns/new')
    expect(screen.getAllByRole('link', { name: 'New campaign' })).toHaveLength(2)
  })

  it('shows the heading and busy skeleton items, but no sections, while loading (CL-UX-10, CL-A11Y-9)', () => {
    mockUseCampaignList.mockReturnValue(query({ isPending: true, isFetching: true }))

    const { container } = render(<CampaignList />)

    expect(screen.getByRole('heading', { level: 1, name: 'Your campaigns' })).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('keeps the list visible without skeletons while refetching on focus (CL-UX-11)', () => {
    mockUseCampaignList.mockReturnValue(loaded([keeperListItem], { isFetching: true }))

    const { container } = render(<CampaignList />)

    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
    expect(screen.getByRole('link', { name: 'The Haunting' })).toBeInTheDocument()
  })

  it('shows an alert with Try again when loading fails, and retries (CL-UX-10, CL-A11Y-7)', async () => {
    mockUseCampaignList.mockReturnValue(query({ isError: true }))

    render(<CampaignList />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent("We couldn't load your campaigns.")
    mockRefetch.mockResolvedValue({ isSuccess: false })
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('disables the retry button while trying again', () => {
    mockUseCampaignList.mockReturnValue(query({ isError: true, isFetching: true }))

    render(<CampaignList />)

    expect(screen.getByRole('button', { name: 'Trying again...' })).toBeDisabled()
  })

  it('moves focus to the heading once a retry succeeds (CL-A11Y-7)', async () => {
    mockUseCampaignList.mockReturnValue(query({ isError: true }))
    mockRefetch.mockResolvedValue({ isSuccess: true })
    render(<CampaignList />)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Your campaigns' })).toHaveFocus()
  })

  it('leaves focus on Try again when the retry fails again', async () => {
    mockUseCampaignList.mockReturnValue(query({ isError: true }))
    mockRefetch.mockResolvedValue({ isSuccess: false })
    render(<CampaignList />)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Your campaigns' })).not.toHaveFocus()
  })

  it('does not move focus when the list loads without a retry (CL-A11Y-9)', () => {
    mockUseCampaignList.mockReturnValue(loaded([keeperListItem]))

    render(<CampaignList />)

    expect(screen.getByRole('heading', { level: 1, name: 'Your campaigns' })).not.toHaveFocus()
  })
})
