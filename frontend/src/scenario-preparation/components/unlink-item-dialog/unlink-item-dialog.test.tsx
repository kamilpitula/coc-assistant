import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UnlinkItemDialog } from './unlink-item-dialog'

// specs/scenario-preparation/ux.md section 64.3; SP-UX-99, SP-A11Y-54.
function renderDialog(overrides: Partial<Parameters<typeof UnlinkItemDialog>[0]> = {}) {
  const handlers = { onConfirm: vi.fn(), onCancel: vi.fn(), onCloseAutoFocus: vi.fn() }
  render(<UnlinkItemDialog open name="Walter Corbitt's diary" pending={false} failed={false} refused={false} {...handlers} {...overrides} />)
  return handlers
}

describe('UnlinkItemDialog', () => {
  it('asks to unlink the named Item and says it stays in the Campaign with its Handouts (SP-UX-99)', () => {
    renderDialog()

    expect(screen.getByRole('alertdialog', { name: "Unlink Walter Corbitt's diary?" })).toBeInTheDocument()
    expect(screen.getByText("Walter Corbitt's diary stays in the Campaign with its Handouts.")).toBeInTheDocument()
  })

  it('confirms with Unlink and cancels with Cancel', async () => {
    const { onConfirm, onCancel } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Unlink' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons while unlinking', () => {
    renderDialog({ pending: true })

    expect(screen.getByRole('button', { name: 'Unlinking...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('alerts on a failure and keeps Unlink available', () => {
    renderDialog({ failed: true })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't unlink Walter Corbitt's diary. Try again.")
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeEnabled()
  })

  it('alerts that the Scene is finished and disables Unlink (SP-UX-99)', () => {
    renderDialog({ refused: true })

    expect(screen.getByRole('alert')).toHaveTextContent("This Scene has been finished, so it can't be changed.")
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeDisabled()
  })
})
