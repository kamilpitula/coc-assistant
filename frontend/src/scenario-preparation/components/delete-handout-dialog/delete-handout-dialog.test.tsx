import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DeleteHandoutDialog } from './delete-handout-dialog'

// specs/scenario-preparation/ux.md sections 44 and 65; SP-UX-71, SP-UX-75, SP-UX-100.
const REFUSED = "This Scene has been started, so this Handout can't be deleted."
function renderDialog(overrides: Partial<Parameters<typeof DeleteHandoutDialog>[0]> = {}) {
  const handlers = { onConfirm: vi.fn(), onCancel: vi.fn(), onCloseAutoFocus: vi.fn() }
  render(<DeleteHandoutDialog open handoutTitle="The front door" pending={false} failed={false} refused={false} refusedMessage={REFUSED} {...handlers} {...overrides} />)
  return handlers
}

describe('DeleteHandoutDialog', () => {
  it('asks to delete the named Handout and says it cannot be undone', () => {
    renderDialog()

    expect(screen.getByRole('alertdialog', { name: 'Delete The front door?' })).toBeInTheDocument()
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument()
  })

  it('confirms with Delete Handout and cancels with Cancel', async () => {
    const { onConfirm, onCancel } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Delete Handout' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons while deleting (SP-UX-75)', () => {
    renderDialog({ pending: true })

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('alerts on a failure', () => {
    renderDialog({ failed: true })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't delete the Handout. Try again.")
  })

  it('alerts with the message of the owner when the delete is refused and does not offer the delete again (SP-UX-71)', () => {
    renderDialog({ refused: true })

    expect(screen.getByRole('alert')).toHaveTextContent("This Scene has been started, so this Handout can't be deleted.")
    expect(screen.getByRole('button', { name: 'Delete Handout' })).toBeDisabled()
  })

  it('shows the refusal of an Item that is part of a played Scene (SP-UX-100)', () => {
    renderDialog({ refused: true, refusedMessage: "This Item is now part of a Scene that has been played, so this Handout can't be deleted." })

    expect(screen.getByRole('alert')).toHaveTextContent("This Item is now part of a Scene that has been played, so this Handout can't be deleted.")
  })
})
