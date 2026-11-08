import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { WallEntry } from '@/campaign-play/types/WallEntry'

import { ActiveSceneWall } from './active-scene-wall'

// specs/scene-play/ux.md section 21.8; SPL-UX-49, SPL-UX-50.

const { mockUseWallPreview, mockMutateAsync } = vi.hoisted(() => ({
  mockUseWallPreview: vi.fn(),
  mockMutateAsync: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useWallEntries', () => ({
  useWallPreview: mockUseWallPreview,
  useAddWallEntry: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}))

function entry(id: string, overrides: Partial<WallEntry> = {}): WallEntry {
  return { id, text: `Text ${id}`, visibility: 'Public', createdAt: '2026-10-16T19:02:00Z', authorDisplayName: 'Eleanor Hart', ...overrides }
}

function loaded(entries: WallEntry[]) {
  return { data: { entries, nextCursor: null }, isPending: false, isError: false, isFetchedAfterMount: true, refetch: vi.fn() }
}

describe('ActiveSceneWall', () => {
  it('shows the Keeper the "Wall" region with the compose box, the visibility choice, and a 2-row Textarea (SPL-UX-49)', async () => {
    mockUseWallPreview.mockReturnValue(loaded([entry('a')]))
    mockMutateAsync.mockResolvedValue(entry('a'))

    render(<ActiveSceneWall campaignId="c1" viewerRole="Keeper" onWallEntryAdded={vi.fn()} />)

    const region = screen.getByRole('region', { name: 'Wall' })
    expect(within(region).getByRole('heading', { level: 2, name: 'Wall' })).toBeInTheDocument()
    expect(within(region).getByRole('textbox', { name: 'New Wall Entry' })).toHaveAttribute('rows', '2')
    expect(within(region).getByRole('radiogroup', { name: 'Who can read this?' })).toBeInTheDocument()
    expect(within(region).getByRole('radio', { name: /Public/ })).toBeChecked()
    expect(within(region).getByRole('link', { name: 'Open the Wall' })).toBeInTheDocument()
  })

  it('marks Keeper only entries with a badge and offers no Remove or older entries on the Active Scene', () => {
    mockUseWallPreview.mockReturnValue(loaded([entry('a', { visibility: 'KeeperOnly' }), entry('b')]))

    render(<ActiveSceneWall campaignId="c1" viewerRole="Keeper" onWallEntryAdded={vi.fn()} />)

    const region = screen.getByRole('region', { name: 'Wall' })
    const items = within(region).getAllByRole('listitem')
    expect(within(items[0]).getByText('Keeper only')).toBeInTheDocument()
    expect(within(items[1]).queryByText('Keeper only')).not.toBeInTheDocument()
    expect(within(region).queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    expect(within(region).queryByRole('button', { name: 'Show older entries' })).not.toBeInTheDocument()
  })

  it('gives a Player no visibility choice and no badge, only the help text (SPL-UX-49)', () => {
    mockUseWallPreview.mockReturnValue(loaded([entry('a')]))

    render(<ActiveSceneWall campaignId="c1" viewerRole="Player" onWallEntryAdded={vi.fn()} />)

    const region = screen.getByRole('region', { name: 'Wall' })
    expect(within(region).queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(within(region).getByText('Everyone in this Campaign can read this.')).toBeInTheDocument()
    expect(within(region).queryByText('Keeper only')).not.toBeInTheDocument()
  })

  it('calls onWallEntryAdded after a successful post (SPL-UX-49)', async () => {
    mockUseWallPreview.mockReturnValue(loaded([]))
    mockMutateAsync.mockResolvedValue(entry('new'))
    const onWallEntryAdded = vi.fn()

    render(<ActiveSceneWall campaignId="c1" viewerRole="Keeper" onWallEntryAdded={onWallEntryAdded} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'New Wall Entry' }), 'The front door slams shut.')
    await userEvent.click(screen.getByRole('button', { name: 'Add to the Wall' }))

    expect(mockMutateAsync).toHaveBeenCalledWith({ text: 'The front door slams shut.', visibility: 'Public' })
    expect(onWallEntryAdded).toHaveBeenCalledTimes(1)
  })

  it('shows the failure alert and keeps the text when a post fails (WL-UX-6)', async () => {
    mockUseWallPreview.mockReturnValue(loaded([]))
    mockMutateAsync.mockRejectedValue(new Error('boom'))
    const onWallEntryAdded = vi.fn()

    render(<ActiveSceneWall campaignId="c1" viewerRole="Keeper" onWallEntryAdded={onWallEntryAdded} />)
    const textbox = screen.getByRole('textbox', { name: 'New Wall Entry' })
    await userEvent.type(textbox, 'Keep me')
    await userEvent.click(screen.getByRole('button', { name: 'Add to the Wall' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't add your entry.")
    expect(textbox).toHaveValue('Keep me')
    expect(onWallEntryAdded).not.toHaveBeenCalled()
  })
})
