import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TakeBackItemDialog } from './take-back-item-dialog'

// specs/scene-play/ux.md section 22.4; SPL-UX-54.
const baseProps = {
  open: true,
  itemName: "Walter Corbitt's diary",
  holderName: 'Harvey Walters',
  pending: false,
  refusal: null as string | null,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  onCloseAutoFocus: vi.fn(),
}

describe('TakeBackItemDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks "Take {name} back from {holder}?", names who keeps the Clue, and confirms', async () => {
    const onConfirm = vi.fn()
    render(<TakeBackItemDialog {...baseProps} onConfirm={onConfirm} />)

    expect(screen.getByRole('alertdialog', { name: "Take Walter Corbitt's diary back from Harvey Walters?" })).toBeInTheDocument()
    expect(screen.getByText('Harvey Walters keeps it among their Clues.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Take back' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('reads "Taking back..." with both buttons disabled, and Escape does not close it', async () => {
    const onCancel = vi.fn()
    render(<TakeBackItemDialog {...baseProps} pending onCancel={onCancel} />)

    expect(screen.getByRole('button', { name: 'Taking back...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('shows a refusal as an alert inside the dialog', () => {
    render(<TakeBackItemDialog {...baseProps} refusal="We couldn't take Walter Corbitt's diary back. Try again." />)

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't take Walter Corbitt's diary back. Try again.")
  })

  it('cancels back to "Take back"', async () => {
    const onCancel = vi.fn()
    render(<TakeBackItemDialog {...baseProps} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
