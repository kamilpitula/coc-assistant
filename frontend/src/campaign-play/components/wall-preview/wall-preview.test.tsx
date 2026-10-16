import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WallEntry } from '@/campaign-play/types/WallEntry'

import { WallPreview } from './wall-preview'

// specs/campaign-wall/ux.md section 7 and specs/campaign-overview/ux.md section 7; WL-UX-9, CO-UX-14.

const { mockUseWallPreview } = vi.hoisted(() => ({ mockUseWallPreview: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useWallEntries', () => ({ useWallPreview: mockUseWallPreview }))

function entry(id: string, overrides: Partial<WallEntry> = {}): WallEntry {
  return { id, text: `Text ${id}`, visibility: 'Public', createdAt: '2026-10-03T19:02:00Z', authorDisplayName: 'Eleanor Hart', ...overrides }
}

function loaded(entries: WallEntry[]) {
  return { data: { entries, nextCursor: null }, isPending: false, isError: false, refetch: vi.fn() }
}

describe('WallPreview', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists the entries with author and text under the "Wall" heading, and links to the Wall (CO-UX-14)', () => {
    mockUseWallPreview.mockReturnValue(loaded([entry('a'), entry('b', { authorDisplayName: 'Ana Ruiz' })]))

    render(<WallPreview campaignId="c1" />)

    const section = screen.getByRole('region', { name: 'Wall' })
    expect(within(section).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Eleanor HartText a'),
      expect.stringContaining('Ana RuizText b'),
    ])
    expect(within(section).getByRole('link', { name: 'Open the Wall' })).toHaveAttribute('href', '/campaigns/c1/wall')
  })

  it('clamps the text to three lines (the full text is on the Wall)', () => {
    mockUseWallPreview.mockReturnValue(loaded([entry('a')]))

    render(<WallPreview campaignId="c1" />)

    expect(screen.getByText('Text a')).toHaveClass('line-clamp-3')
  })

  it('marks Keeper only entries with a "Keeper only" badge, which only the Keeper is ever sent (CO-UX-14)', () => {
    mockUseWallPreview.mockReturnValue(loaded([entry('a', { visibility: 'KeeperOnly' }), entry('b')]))

    render(<WallPreview campaignId="c1" />)

    expect(screen.getAllByText('Keeper only')).toHaveLength(1)
  })

  it('has no compose box: "Open the Wall" is the only action', () => {
    mockUseWallPreview.mockReturnValue(loaded([entry('a')]))

    render(<WallPreview campaignId="c1" />)

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('says the Wall is empty and still links to it', () => {
    mockUseWallPreview.mockReturnValue(loaded([]))

    render(<WallPreview campaignId="c1" />)

    expect(screen.getByText('Nothing on the Wall yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the Wall' })).toBeInTheDocument()
  })

  it('shows three busy placeholders while loading, without the link', () => {
    mockUseWallPreview.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() })

    const { container } = render(<WallPreview campaignId="c1" />)

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)
    expect(screen.queryByRole('link', { name: 'Open the Wall' })).not.toBeInTheDocument()
  })

  it('shows an error with "Try again" that reloads', async () => {
    const refetch = vi.fn()
    mockUseWallPreview.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch })

    render(<WallPreview campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load the Wall.")).toBeInTheDocument()
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
