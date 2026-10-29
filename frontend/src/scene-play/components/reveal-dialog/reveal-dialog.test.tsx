import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RevealDialog } from './reveal-dialog'

// specs/scene-play/ux.md section 13; SPL-UX-21, SPL-UX-23, SPL-UX-24, SPL-UX-36, SPL-A11Y-9.

const investigators = [
  { id: 'i1', name: 'Harvey Walters' },
  { id: 'i2', name: 'Lucy Ward' },
  { id: 'i3', name: null },
]

const baseProps = {
  open: true,
  title: 'The front door',
  summary: 'Read-aloud . Player-facing',
  investigators,
  alreadyRevealedIds: new Set<string>(),
  pending: false,
  refusal: null,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  onCloseAutoFocus: vi.fn(),
}

describe('RevealDialog', () => {
  it('is named "Reveal {title}", describes what is revealed, and puts focus on the first checkbox (SPL-A11Y-9)', async () => {
    render(<RevealDialog {...baseProps} />)

    expect(screen.getByRole('dialog', { name: 'Reveal The front door' })).toBeInTheDocument()
    expect(screen.getByText('Read-aloud . Player-facing')).toBeInTheDocument()
    expect(await screen.findByRole('checkbox', { name: 'Harvey Walters' })).toHaveFocus()
    expect(screen.getByRole('group', { name: 'Reveal to' })).toHaveAccessibleDescription("Players see it as it is now. A Reveal can't be undone.")
  })

  it('pre-checks every Investigator who has not received it and marks those who have "(already revealed)" (SPL-UX-21)', () => {
    render(<RevealDialog {...baseProps} alreadyRevealedIds={new Set(['i2'])} />)

    expect(screen.getByRole('checkbox', { name: 'Harvey Walters' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Lucy Ward (already revealed)' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Unnamed Investigator' })).toBeChecked()
  })

  it('checks nothing when everyone has received it, and refuses to confirm with "Choose at least one Investigator." (SPL-UX-23)', async () => {
    const onConfirm = vi.fn()
    render(<RevealDialog {...baseProps} onConfirm={onConfirm} alreadyRevealedIds={new Set(['i1', 'i2', 'i3'])} />)

    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByText('Choose at least one Investigator.')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Reveal to' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('checkbox', { name: /Harvey Walters/ })).toHaveFocus()
  })

  it('sends the checked Investigators explicitly, in list order', async () => {
    const onConfirm = vi.fn()
    render(<RevealDialog {...baseProps} onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Lucy Ward' }))
    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    expect(onConfirm).toHaveBeenCalledWith(['i1', 'i3'])
  })

  it('cancels without revealing', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<RevealDialog {...baseProps} onConfirm={onConfirm} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('reads "Revealing..." with both buttons disabled, and Escape does not close it (SPL-UX-36)', async () => {
    const onCancel = vi.fn()
    render(<RevealDialog {...baseProps} pending onCancel={onCancel} />)

    expect(screen.getByRole('button', { name: 'Revealing...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('shows a refusal as an alert inside the dialog (SPL-UX-24)', () => {
    render(<RevealDialog {...baseProps} refusal={{ message: 'This Scene has been finished, so nothing more can be revealed.' }} />)

    expect(screen.getByRole('alert')).toHaveTextContent('This Scene has been finished, so nothing more can be revealed.')
  })

  it('keeps the choices by id when the list is refetched, and drops an Investigator who left', async () => {
    const { rerender } = render(<RevealDialog {...baseProps} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Harvey Walters' }))

    rerender(<RevealDialog {...baseProps} investigators={[investigators[0], investigators[2]]} />)

    expect(screen.getByRole('checkbox', { name: 'Harvey Walters' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Unnamed Investigator' })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: 'Lucy Ward' })).not.toBeInTheDocument()
  })
})
