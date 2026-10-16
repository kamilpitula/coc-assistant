import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { WallEntry } from '@/campaign-play/types/WallEntry'

import { WallPreview } from './wall-preview'

// specs/campaign-wall/ux.md section 7 and specs/campaign-overview/ux.md section 7; WL-UX-9, CO-UX-14.

const { mockUseWallPreview } = vi.hoisted(() => ({ mockUseWallPreview: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useWallEntries', () => ({ useWallPreview: mockUseWallPreview }))

function entry(id: string, overrides: Partial<WallEntry> = {}): WallEntry {
  return { id, text: `Text ${id}`, visibility: 'Public', createdAt: '2026-10-03T19:02:00Z', authorDisplayName: 'Eleanor Hart', ...overrides }
}

function loaded(entries: WallEntry[], isFetchedAfterMount = true) {
  return { data: { entries, nextCursor: null }, isPending: false, isError: false, isFetchedAfterMount, refetch: vi.fn() }
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

  describe('live updates (WL-UX-11, WL-UX-13, WL-UX-14, CO-A11Y-7)', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    const polite = () => document.querySelector('[aria-live="polite"]')

    it('puts a new entry at the top, drops the sixth, and announces it politely in the one live region of the section', () => {
      const five = ['e', 'd', 'c', 'b', 'a'].map((id) => entry(id, { createdAt: `2026-10-03T19:0${'abcde'.indexOf(id)}:00Z` }))
      mockUseWallPreview.mockReturnValue(loaded(five))
      const { rerender } = render(<WallPreview campaignId="c1" />)

      const arrival = entry('f', { createdAt: '2026-10-03T19:30:00Z', authorDisplayName: 'Ana Ruiz' })
      mockUseWallPreview.mockReturnValue(loaded([arrival, ...five.slice(0, 4)]))
      rerender(<WallPreview campaignId="c1" />)

      const items = within(screen.getByRole('region', { name: 'Wall' })).getAllByRole('listitem')
      expect(items).toHaveLength(5)
      expect(items[0]).toHaveTextContent('Text f')
      expect(screen.queryByText('Text a')).not.toBeInTheDocument()
      expect(document.querySelectorAll('[aria-live]')).toHaveLength(1)
      expect(polite()).toHaveTextContent('New Wall Entry from Ana Ruiz.')
    })

    it('announces nothing on first load, even when cached entries showed first (WL-UX-14)', () => {
      mockUseWallPreview.mockReturnValue(loaded([entry('a')], false))
      const { rerender } = render(<WallPreview campaignId="c1" />)

      mockUseWallPreview.mockReturnValue(loaded([entry('b', { createdAt: '2026-10-03T20:00:00Z' }), entry('a')], true))
      rerender(<WallPreview campaignId="c1" />)

      expect(polite()?.textContent).toBe('')
    })

    it('lets a removed entry go and the next older one fill in, without announcing (WL-UX-13)', () => {
      const entries = [entry('c', { createdAt: '2026-10-03T19:30:00Z' }), entry('b', { createdAt: '2026-10-03T19:20:00Z' })]
      mockUseWallPreview.mockReturnValue(loaded(entries))
      const { rerender } = render(<WallPreview campaignId="c1" />)

      mockUseWallPreview.mockReturnValue(loaded([entries[0], entry('a', { createdAt: '2026-10-03T19:10:00Z' })]))
      rerender(<WallPreview campaignId="c1" />)

      expect(screen.getByText('Text a')).toBeInTheDocument()
      expect(screen.queryByText('Text b')).not.toBeInTheDocument()
      expect(polite()?.textContent).toBe('')
    })

    it('merges entries that arrive within 5 seconds into one later announcement (WL-UX-14)', () => {
      const first = entry('a', { createdAt: '2026-10-03T19:00:00Z' })
      mockUseWallPreview.mockReturnValue(loaded([first]))
      const { rerender } = render(<WallPreview campaignId="c1" />)
      const second = entry('b', { createdAt: '2026-10-03T19:01:00Z' })
      const third = entry('c', { createdAt: '2026-10-03T19:02:00Z' })
      const fourth = entry('d', { createdAt: '2026-10-03T19:03:00Z' })

      mockUseWallPreview.mockReturnValue(loaded([second, first]))
      rerender(<WallPreview campaignId="c1" />)
      mockUseWallPreview.mockReturnValue(loaded([fourth, third, second, first]))
      rerender(<WallPreview campaignId="c1" />)
      expect(polite()).toHaveTextContent('New Wall Entry from Eleanor Hart.')

      act(() => vi.advanceTimersByTime(5000))

      expect(polite()).toHaveTextContent('2 new Wall Entries from Eleanor Hart.')
    })
  })
})
