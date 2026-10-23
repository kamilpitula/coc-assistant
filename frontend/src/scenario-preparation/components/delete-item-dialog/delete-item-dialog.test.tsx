import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DeleteItemDialog } from './delete-item-dialog'

// specs/scenario-preparation/ux.md section 63.3; SP-UX-95, SP-A11Y-54.
function renderDialog(overrides: Partial<Parameters<typeof DeleteItemDialog>[0]> = {}) {
  const handlers = { onConfirm: vi.fn(), onCancel: vi.fn(), onCloseAutoFocus: vi.fn() }
  render(<DeleteItemDialog open name="Walter Corbitt's diary" pending={false} failed={false} refusedBecause={null} {...handlers} {...overrides} />)
  return handlers
}

describe('DeleteItemDialog', () => {
  it('asks to delete the named Item and says what goes with it (SP-UX-95)', () => {
    renderDialog()

    expect(screen.getByRole('alertdialog', { name: "Delete Walter Corbitt's diary?" })).toBeInTheDocument()
    expect(
      screen.getByText("This can't be undone. Its Handouts are deleted, and it is removed from any Prepared Scene it is part of."),
    ).toBeInTheDocument()
  })

  it('confirms with Delete and cancels with Cancel', async () => {
    const { onConfirm, onCancel } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons while deleting', () => {
    renderDialog({ pending: true })

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('alerts on a failure and keeps Delete available', () => {
    renderDialog({ failed: true })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't delete Walter Corbitt's diary. Try again.")
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled()
  })

  it('alerts that a Scene has been played and disables Delete, without the words "in play" (SP-UX-95, SP-UX-103)', () => {
    renderDialog({ refusedBecause: 'played' })

    expect(screen.getByRole('alert')).toHaveTextContent("Walter Corbitt's diary is part of a Scene that has been played, so it can't be deleted.")
    expect(screen.getByRole('alert')).not.toHaveTextContent(/in play/i)
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })

  it('alerts that an Investigator holds the Item and disables Delete (SP-UX-95)', () => {
    renderDialog({ refusedBecause: 'held' })

    expect(screen.getByRole('alert')).toHaveTextContent("Walter Corbitt's diary is held by an Investigator, so it can't be deleted.")
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })
})
