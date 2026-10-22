import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UnlinkNonPlayerEntityDialog } from './unlink-non-player-entity-dialog'

// specs/scenario-preparation/ux.md section 34; SP-UX-56, SP-UX-57, SP-UX-61.
function renderDialog(overrides: Partial<Parameters<typeof UnlinkNonPlayerEntityDialog>[0]> = {}) {
  const handlers = { onConfirm: vi.fn(), onCancel: vi.fn(), onCloseAutoFocus: vi.fn() }
  render(
    <UnlinkNonPlayerEntityDialog
      open
      playerFacingName="A shape in the cellar"
      profileName="Ghoul"
      pending={false}
      failed={false}
      refused={false}
      {...handlers}
      {...overrides}
    />,
  )
  return handlers
}

describe('UnlinkNonPlayerEntityDialog', () => {
  it('asks to unlink the named link and says the profile stays', () => {
    renderDialog()

    expect(screen.getByRole('alertdialog', { name: 'Unlink A shape in the cellar?' })).toBeInTheDocument()
    expect(screen.getByText('Its Player-facing name and description are deleted. Ghoul stays in the Campaign.')).toBeInTheDocument()
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

  it('alerts on a failure', () => {
    renderDialog({ failed: true })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't unlink A shape in the cellar. Try again.")
  })

  it('alerts when the Scene has been finished and does not offer the unlink again', () => {
    renderDialog({ refused: true })

    expect(screen.getByRole('alert')).toHaveTextContent("This Scene has been finished, so it can't be changed.")
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeDisabled()
  })
})
