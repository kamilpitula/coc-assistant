import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { WallEntry } from '@/campaign-play/types/WallEntry'

import { RemoveWallEntryDialog } from './remove-wall-entry-dialog'

// specs/campaign-wall/ux.md section 4.3; WL-UX-7, WL-A11Y-6.
const publicEntry: WallEntry = {
  id: 'e1',
  text: 'Known.',
  visibility: 'Public',
  createdAt: '2026-10-16T19:02:00Z',
  authorDisplayName: 'Eleanor Hart',
}

function renderDialog(overrides: Partial<React.ComponentProps<typeof RemoveWallEntryDialog>> = {}) {
  const props = {
    entry: publicEntry,
    pending: false,
    failed: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onCloseAutoFocus: vi.fn(),
    ...overrides,
  }
  render(<RemoveWallEntryDialog {...props} />)
  return props
}

describe('RemoveWallEntryDialog', () => {
  it('is closed without an entry', () => {
    renderDialog({ entry: null })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('warns that Players will no longer see a Public entry, and starts focus on Cancel', () => {
    renderDialog()

    expect(screen.getByRole('alertdialog', { name: 'Remove this Wall Entry?' })).toHaveAccessibleDescription(
      "Players will no longer see it. This can't be undone.",
    )
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('does not mention Players for a Keeper only entry', () => {
    renderDialog({ entry: { ...publicEntry, visibility: 'KeeperOnly' } })

    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription("This can't be undone.")
  })

  it('removes on "Remove entry" and cancels on "Cancel"', async () => {
    const props = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Remove entry' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(props.onConfirm).toHaveBeenCalledTimes(1)
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows a busy action while removing and an error that keeps the dialog open', () => {
    renderDialog({ pending: true, failed: true })

    expect(screen.getByRole('button', { name: 'Removing...' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't remove that entry. Try again.")
  })
})
