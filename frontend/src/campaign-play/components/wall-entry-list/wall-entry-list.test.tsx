import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { WallEntry } from '@/campaign-play/types/WallEntry'

import { WallEntryList } from './wall-entry-list'

// specs/campaign-wall/ux.md sections 2 and 4.3; WL-UX-4, WL-UX-5, WL-UX-7, WL-A11Y-1, WL-A11Y-4, WL-A11Y-6.

function entry(id: string, overrides: Partial<WallEntry> = {}): WallEntry {
  return {
    id,
    text: `Text ${id}`,
    visibility: 'Public',
    createdAt: '2026-10-03T19:02:00Z',
    authorDisplayName: 'Eleanor Hart',
    ...overrides,
  }
}

function renderList(overrides: Partial<React.ComponentProps<typeof WallEntryList>> = {}) {
  const onRemove = vi.fn().mockResolvedValue(true)
  const entries = [entry('a'), entry('b', { visibility: 'KeeperOnly', text: 'Secret b' }), entry('c')]
  render(<WallEntryList entries={entries} viewerRole="Keeper" fallbackFocusId="fallback" onRemove={onRemove} {...overrides} />)
  return { onRemove, entries }
}

describe('WallEntryList', () => {
  it('lists the entries in the order given, each with its time, author, and full text (WL-UX-5, WL-A11Y-1)', () => {
    renderList({ viewerRole: 'Player', entries: [entry('a'), entry('c', { authorDisplayName: 'Ana Ruiz', text: 'Line one\nLine two' })] })

    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => item.querySelector('time')?.getAttribute('datetime'))).toEqual([
      '2026-10-03T19:02:00Z',
      '2026-10-03T19:02:00Z',
    ])
    expect(items[1]).toHaveTextContent('Ana Ruiz')
    expect(within(items[1]).getByText(/Line one/)).toHaveClass('whitespace-pre-line')
  })

  it('shows the Keeper a "Keeper only" badge on those entries only (WL-UX-4, WL-A11Y-4)', () => {
    renderList()

    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => within(item).queryByText('Keeper only') !== null)).toEqual([false, true, false])
  })

  it('gives a Player no Remove buttons and no Keeper only badge (WL-UX-7)', () => {
    renderList({ viewerRole: 'Player', entries: [entry('a'), entry('c')] })

    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Keeper only')).not.toBeInTheDocument()
  })

  it('names each Remove button after the entry it removes (WL-A11Y-6)', () => {
    renderList({ entries: [entry('a', { createdAt: '2026-10-03T19:02:00Z' })] })

    expect(screen.getByRole('button', { name: /^Remove Wall Entry from Eleanor Hart at / })).toBeInTheDocument()
  })

  it('removes an entry only after the Keeper confirms, then moves focus to the next entry (WL-UX-7)', async () => {
    const { onRemove } = renderList()

    await userEvent.click(within(screen.getAllByRole('listitem')[1]).getByRole('button', { name: /Remove/ }))
    expect(onRemove).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Remove entry' }))

    expect(onRemove).toHaveBeenCalledWith('b')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await waitFor(() => expect(within(screen.getAllByRole('listitem')[2]).getByRole('button', { name: /Remove/ })).toHaveFocus())
  })

  it('returns focus to the Remove button that opened the dialog when cancelled (WL-A11Y-6)', async () => {
    const { onRemove } = renderList()
    const remove = within(screen.getAllByRole('listitem')[0]).getByRole('button', { name: /Remove/ })

    await userEvent.click(remove)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onRemove).not.toHaveBeenCalled()
    await waitFor(() => expect(remove).toHaveFocus())
  })

  it('keeps the dialog open with an error when the removal fails (WL-UX-7)', async () => {
    renderList({ onRemove: vi.fn().mockResolvedValue(false) })

    await userEvent.click(within(screen.getAllByRole('listitem')[0]).getByRole('button', { name: /Remove/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove entry' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't remove that entry. Try again.")
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  describe('live removal (WL-UX-13, WL-A11Y-11)', () => {
    const [a, b, c] = [entry('a'), entry('b'), entry('c')]
    const list = (entries: WallEntry[]) => (
      <WallEntryList entries={entries} viewerRole="Keeper" fallbackFocusId="fallback" onRemove={vi.fn()} />
    )
    const removeButtonOf = (index: number) => within(screen.getAllByRole('listitem')[index]).getByRole('button', { name: /Remove/ })

    it('moves focus to the next entry when the entry of the focused Remove button is removed elsewhere', () => {
      const { rerender } = render(list([a, b, c]))
      removeButtonOf(1).focus()

      rerender(list([a, c]))

      expect(removeButtonOf(1)).toHaveFocus()
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })

    it('moves focus to the previous entry when the focused entry was the last, and to the fallback when it was the only one', () => {
      const { rerender } = render(
        <>
          {list([a, b])}
          <input id="fallback" />
        </>,
      )
      removeButtonOf(1).focus()

      rerender(
        <>
          {list([a])}
          <input id="fallback" />
        </>,
      )
      expect(removeButtonOf(0)).toHaveFocus()

      rerender(
        <>
          {list([])}
          <input id="fallback" />
        </>,
      )
      expect(document.getElementById('fallback')).toHaveFocus()
    })

    it('leaves focus alone when another entry is removed or an entry arrives', () => {
      const { rerender } = render(
        <>
          {list([a, b, c])}
          <input id="outside" />
        </>,
      )
      removeButtonOf(0).focus()

      rerender(
        <>
          {list([a, c])}
          <input id="outside" />
        </>,
      )
      expect(removeButtonOf(0)).toHaveFocus()

      rerender(
        <>
          {list([entry('new'), a, c])}
          <input id="outside" />
        </>,
      )
      expect(removeButtonOf(1)).toHaveFocus()
    })

    it('does not take focus when focus is elsewhere and an entry is removed', () => {
      const { rerender } = render(
        <>
          {list([a, b])}
          <input id="outside" />
        </>,
      )
      document.getElementById('outside')?.focus()

      rerender(
        <>
          {list([a])}
          <input id="outside" />
        </>,
      )

      expect(document.getElementById('outside')).toHaveFocus()
    })
  })
})
