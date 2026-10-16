import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { rememberOwnWallEntry } from '@/campaign-play/services/ownWallEntries'
import type { WallEntry } from '@/campaign-play/types/WallEntry'

import { CampaignWall } from './campaign-wall'

// specs/campaign-wall/ux.md sections 2 and 4; WL-UX-1 to WL-UX-8.

const { mockUseCampaign, mockUseWallEntries, mockAdd, mockRemove } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseWallEntries: vi.fn(),
  mockAdd: vi.fn(),
  mockRemove: vi.fn(),
}))

vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/campaign-play/hooks/useWallEntries', () => ({
  useWallEntries: mockUseWallEntries,
  useAddWallEntry: () => ({ mutateAsync: mockAdd, isPending: false }),
  useRemoveWallEntry: () => ({ mutateAsync: mockRemove, isPending: false }),
}))

function entry(id: string, overrides: Partial<WallEntry> = {}): WallEntry {
  return { id, text: `Text ${id}`, visibility: 'Public', createdAt: '2026-10-03T19:02:00Z', authorDisplayName: 'Eleanor Hart', ...overrides }
}

function loaded(pages: WallEntry[][], overrides: Record<string, unknown> = {}) {
  return {
    data: { pages: pages.map((entries) => ({ entries, nextCursor: null })) },
    isPending: false,
    isError: false,
    isFetchNextPageError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchedAfterMount: true,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  }
}

describe('CampaignWall', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseWallEntries.mockReturnValue(loaded([[entry('a')]]))
  })

  it('shows the "Wall" heading, the compose box, and the entries (WL-UX-1)', () => {
    render(<CampaignWall campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Wall' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'New Wall Entry' })).toBeInTheDocument()
    expect(screen.getByText('Text a')).toBeInTheDocument()
  })

  it('gives a Player the compose box without the visibility choice and without Remove (WL-UX-3, WL-UX-7)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })

    render(<CampaignWall campaignId="c1" />)

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
  })

  it('shows busy placeholders while loading, with the compose box usable (WL-UX-8)', () => {
    mockUseWallEntries.mockReturnValue({ ...loaded([]), data: undefined, isPending: true })

    const { container } = render(<CampaignWall campaignId="c1" />)

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'New Wall Entry' })).toBeEnabled()
  })

  it('says the Wall is empty (WL-UX-8)', () => {
    mockUseWallEntries.mockReturnValue(loaded([[]]))

    render(<CampaignWall campaignId="c1" />)

    expect(screen.getByText('Nothing on the Wall yet.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'New Wall Entry' })).toBeInTheDocument()
  })

  it('shows a load error with "Try again", keeping the compose box (WL-UX-8)', async () => {
    const refetch = vi.fn()
    mockUseWallEntries.mockReturnValue({ ...loaded([]), data: undefined, isPending: false, isError: true, refetch })

    render(<CampaignWall campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load the Wall.")).toBeInTheDocument()
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('textbox', { name: 'New Wall Entry' })).toBeInTheDocument()
  })

  it('offers "Show older entries" only when older entries exist, and loads them (WL-UX-5)', async () => {
    const fetchNextPage = vi.fn()
    mockUseWallEntries.mockReturnValue(loaded([[entry('a')]], { hasNextPage: true, fetchNextPage }))

    render(<CampaignWall campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Show older entries' }))

    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('shows all loaded pages in order and hides "Show older entries" at the end (WL-UX-5)', () => {
    mockUseWallEntries.mockReturnValue(loaded([[entry('a')], [entry('b')]]))

    render(<CampaignWall campaignId="c1" />)

    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Text a'),
      expect.stringContaining('Text b'),
    ])
    expect(screen.queryByRole('button', { name: 'Show older entries' })).not.toBeInTheDocument()
  })

  it('shows a busy, disabled button while older entries load', () => {
    mockUseWallEntries.mockReturnValue(loaded([[entry('a')]], { hasNextPage: true, isFetchingNextPage: true }))

    render(<CampaignWall campaignId="c1" />)

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled()
  })

  it('keeps the loaded entries and offers a retry when older entries fail to load (WL-UX-8)', async () => {
    const fetchNextPage = vi.fn()
    mockUseWallEntries.mockReturnValue(
      loaded([[entry('a')]], { isError: true, isFetchNextPageError: true, hasNextPage: true, fetchNextPage }),
    )

    render(<CampaignWall campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load older entries.")).toBeInTheDocument()
    expect(screen.getByText('Text a')).toBeInTheDocument()
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('announces "Wall Entry added." after a post is stored (WL-UX-2, WL-A11Y-5)', async () => {
    mockAdd.mockResolvedValue(entry('new'))

    render(<CampaignWall campaignId="c1" />)
    await userEvent.type(screen.getByRole('textbox', { name: 'New Wall Entry' }), 'The lamp goes out.')
    await userEvent.click(screen.getByRole('button', { name: 'Add to the Wall' }))

    expect(mockAdd).toHaveBeenCalledWith({ text: 'The lamp goes out.', visibility: 'Public' })
    expect(await screen.findByText('Wall Entry added.')).toBeInTheDocument()
    expect(screen.getByText('Wall Entry added.')).toHaveAttribute('role', 'status')
  })

  it('keeps the text and reports the failure when a post fails (WL-UX-6)', async () => {
    mockAdd.mockRejectedValue(new Error('boom'))

    render(<CampaignWall campaignId="c1" />)
    const textbox = screen.getByRole('textbox', { name: 'New Wall Entry' })
    await userEvent.type(textbox, 'Keep me')
    await userEvent.click(screen.getByRole('button', { name: 'Add to the Wall' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't add your entry.")
    expect(textbox).toHaveValue('Keep me')
  })

  it('removes an entry for the Keeper and announces "Wall Entry removed." (WL-UX-7)', async () => {
    mockRemove.mockResolvedValue(undefined)

    render(<CampaignWall campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: /^Remove Wall Entry/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove entry' }))

    expect(mockRemove).toHaveBeenCalledWith('a')
    expect(await screen.findByText('Wall Entry removed.')).toBeInTheDocument()
  })

  describe('live updates (WL-UX-11, WL-UX-13 to WL-UX-15, WL-A11Y-11, WL-A11Y-12)', () => {
    const older = entry('a', { createdAt: '2026-10-03T19:00:00Z' })
    const arrival = entry('b', { createdAt: '2026-10-03T19:30:00Z', authorDisplayName: 'Ana Ruiz' })

    it('inserts an entry another member adds at the top and keeps the entries loaded through "Show older entries"', () => {
      const oldest = entry('z', { createdAt: '2026-10-03T18:00:00Z' })
      mockUseWallEntries.mockReturnValue(loaded([[older], [oldest]]))
      const { rerender } = render(<CampaignWall campaignId="c1" />)

      mockUseWallEntries.mockReturnValue(loaded([[arrival, older], [oldest]]))
      rerender(<CampaignWall campaignId="c1" />)

      expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
        expect.stringContaining('Text b'),
        expect.stringContaining('Text a'),
        expect.stringContaining('Text z'),
      ])
    })

    it('announces the arrival in a status region of its own, separate from "Wall Entry added." (WL-A11Y-12)', async () => {
      mockAdd.mockResolvedValue(entry('mine'))
      mockUseWallEntries.mockReturnValue(loaded([[older]]))
      const { rerender } = render(<CampaignWall campaignId="c1" />)
      await userEvent.type(screen.getByRole('textbox', { name: 'New Wall Entry' }), 'Mine')
      await userEvent.click(screen.getByRole('button', { name: 'Add to the Wall' }))

      mockUseWallEntries.mockReturnValue(loaded([[arrival, older]]))
      rerender(<CampaignWall campaignId="c1" />)

      const added = await screen.findByText('Wall Entry added.')
      const announced = screen.getByText('New Wall Entry from Ana Ruiz.')
      expect(added).toHaveAttribute('role', 'status')
      expect(announced.closest('[role="status"]')).not.toBe(added)
      expect(within(announced.closest('[role="status"]') as HTMLElement).queryByText('Wall Entry added.')).not.toBeInTheDocument()
    })

    it('announces nothing on first load, for older pages, or for a removal (WL-UX-13, WL-UX-14)', () => {
      mockUseWallEntries.mockReturnValue(loaded([[arrival]], { isFetchedAfterMount: false }))
      const { rerender } = render(<CampaignWall campaignId="c1" />)

      mockUseWallEntries.mockReturnValue(loaded([[arrival]]))
      rerender(<CampaignWall campaignId="c1" />)
      mockUseWallEntries.mockReturnValue(loaded([[arrival], [older]]))
      rerender(<CampaignWall campaignId="c1" />)
      mockUseWallEntries.mockReturnValue(loaded([[older]]))
      rerender(<CampaignWall campaignId="c1" />)

      expect(screen.queryByText(/^New Wall Entry from|^[0-9]+ new Wall Entries/)).not.toBeInTheDocument()
    })

    it('does not announce the own post of the viewer from this tab (WL-UX-14)', () => {
      rememberOwnWallEntry('mine-here')
      mockUseWallEntries.mockReturnValue(loaded([[older]]))
      const { rerender } = render(<CampaignWall campaignId="c1" />)

      mockUseWallEntries.mockReturnValue(loaded([[entry('mine-here', { createdAt: '2026-10-03T19:45:00Z' }), older]]))
      rerender(<CampaignWall campaignId="c1" />)

      expect(screen.getByText('Text mine-here')).toBeInTheDocument()
      expect(screen.queryByText(/New Wall Entry from/)).not.toBeInTheDocument()
    })

    it('leaves the composer text, visibility, and focus untouched (WL-UX-15)', async () => {
      mockUseWallEntries.mockReturnValue(loaded([[older]]))
      const { rerender } = render(<CampaignWall campaignId="c1" />)
      const textbox = screen.getByRole('textbox', { name: 'New Wall Entry' })
      await userEvent.type(textbox, 'Half written')
      await userEvent.click(screen.getByRole('radio', { name: /Keeper only/ }))
      await userEvent.click(textbox)

      mockUseWallEntries.mockReturnValue(loaded([[arrival, older]]))
      rerender(<CampaignWall campaignId="c1" />)

      expect(screen.getByRole('textbox', { name: 'New Wall Entry' })).toHaveValue('Half written')
      expect(screen.getByRole('textbox', { name: 'New Wall Entry' })).toHaveFocus()
      expect(screen.getByRole('radio', { name: /Keeper only/ })).toBeChecked()
    })
  })
})
