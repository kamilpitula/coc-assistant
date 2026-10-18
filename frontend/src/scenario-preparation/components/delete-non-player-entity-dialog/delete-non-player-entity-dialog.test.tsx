import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DeleteNonPlayerEntityDialog } from './delete-non-player-entity-dialog'

// specs/scenario-preparation/ux.md section 25.3; SP-UX-37, SP-UX-40.

function show(overrides: Partial<React.ComponentProps<typeof DeleteNonPlayerEntityDialog>> = {}) {
  const props = {
    open: true,
    name: 'Mr. Knott',
    pending: false,
    failed: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onCloseAutoFocus: vi.fn(),
    ...overrides,
  }
  render(<DeleteNonPlayerEntityDialog {...props} />)
  return props
}

describe('DeleteNonPlayerEntityDialog', () => {
  it('asks "Delete {name}?" with "This can\'t be undone." and Cancel and Delete', async () => {
    const props = show()

    expect(screen.getByRole('alertdialog', { name: 'Delete Mr. Knott?' })).toHaveAccessibleDescription("This can't be undone.")
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(props.onConfirm).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onCancel).toHaveBeenCalled()
  })

  it('disables both buttons and reads "Deleting..." while busy (SP-UX-40)', () => {
    show({ pending: true })

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('explains a failure as an alert in the dialog', () => {
    show({ failed: true })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't delete Mr. Knott. Try again.")
  })

  it('explains a refusal and does not allow Delete', () => {
    show({ refused: true })

    expect(screen.getByRole('alert')).toHaveTextContent("Mr. Knott is part of a Scene that has been played, so it can't be deleted.")
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })
})
