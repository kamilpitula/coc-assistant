import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RemoveSceneDialog } from './remove-scene-dialog'

// specs/scenario-preparation/ux.md section 14; SP-UX-23, SP-UX-27, SP-A11Y-16.
function renderDialog(overrides: Partial<Parameters<typeof RemoveSceneDialog>[0]> = {}) {
  const handlers = { onConfirm: vi.fn(), onCancel: vi.fn(), onCloseAutoFocus: vi.fn() }
  render(<RemoveSceneDialog open sceneTitle="Meeting Knott" pending={false} failed={false} refused={false} {...handlers} {...overrides} />)
  return handlers
}

describe('RemoveSceneDialog', () => {
  it('asks to remove the named Scene and says it cannot be undone', () => {
    renderDialog()

    expect(screen.getByRole('alertdialog', { name: 'Remove Meeting Knott?' })).toBeInTheDocument()
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument()
  })

  it('confirms with Remove Scene and cancels with Cancel', async () => {
    const { onConfirm, onCancel } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Scene' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons while removing', () => {
    renderDialog({ pending: true })

    expect(screen.getByRole('button', { name: 'Removing...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('alerts on a failure', () => {
    renderDialog({ failed: true })

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't remove the Scene. Try again.")
  })

  it('alerts when the Scene has been started and does not offer the removal again', () => {
    renderDialog({ refused: true })

    expect(screen.getByRole('alert')).toHaveTextContent("This Scene has been started, so it can't be removed.")
    expect(screen.getByRole('button', { name: 'Remove Scene' })).toBeDisabled()
  })
})
