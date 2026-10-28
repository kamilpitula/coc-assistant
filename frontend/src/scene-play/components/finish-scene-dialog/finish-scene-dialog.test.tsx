import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FinishSceneDialog } from './finish-scene-dialog'

// specs/scene-play/ux.md section 3 (Finish); SPL-UX-11, SPL-UX-18.
const props = {
  open: true,
  sceneTitle: 'The Corbitt House',
  pending: false,
  failed: false,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  onCloseAutoFocus: vi.fn(),
}

describe('FinishSceneDialog', () => {
  it('asks "Finish {title}?" and explains that a Finished Scene cannot be started again', () => {
    render(<FinishSceneDialog {...props} />)

    expect(screen.getByRole('alertdialog', { name: 'Finish The Corbitt House?' })).toHaveAccessibleDescription(
      "A Finished Scene can't be started again. Players will see that it has finished.",
    )
  })

  it('confirms with Finish Scene and cancels with Cancel', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<FinishSceneDialog {...props} onConfirm={onConfirm} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Finish Scene' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons and reads "Finishing..." while pending', () => {
    render(<FinishSceneDialog {...props} pending />)

    expect(screen.getByRole('button', { name: 'Finishing...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('shows the failure as an alert inside the dialog', () => {
    render(<FinishSceneDialog {...props} failed />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't finish the Scene. Try again.")
  })
})
