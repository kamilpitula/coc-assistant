import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CreationRollAction } from './creation-roll-action'

const props = {
  id: 'roll-trigger',
  label: 'Roll characteristics',
  body: "The app rolls STR once. You can't roll it again, and you can't change your creation method afterwards.",
  onRoll: vi.fn(),
}

/** specs/character-sheet/ux.md section 6.8 "Roll action" (PBI-DICE-002 scope of section 9). */
describe('CreationRollAction', () => {
  it('opens the confirmation dialog from the trigger', async () => {
    render(<CreationRollAction {...props} pending={false} />)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Roll characteristics' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Roll characteristics?' })
    expect(dialog).toHaveTextContent(props.body)
    expect(screen.getByRole('button', { name: 'Roll now' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not yet' })).toBeInTheDocument()
  })

  it('marks the trigger as a wizard action so blurring into it skips validation', () => {
    render(<CreationRollAction {...props} pending={false} />)

    // InvestigatorWizard skips its blur validation for wizard actions: showing or hiding errors would shift the layout
    // under the pointer between mousedown and mouseup, so the trigger click would be lost and the dialog never opens.
    expect(screen.getByRole('button', { name: 'Roll characteristics' })).toHaveAttribute('data-wizard-action')
  })

  it('"Not yet" has initial focus, closes without rolling, and returns focus to the trigger', async () => {
    const onRoll = vi.fn()
    render(<CreationRollAction {...props} pending={false} onRoll={onRoll} />)

    const trigger = screen.getByRole('button', { name: 'Roll characteristics' })
    await userEvent.click(trigger)
    expect(screen.getByRole('button', { name: 'Not yet' })).toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: 'Not yet' }))

    expect(onRoll).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('Escape closes without rolling and returns focus to the trigger', async () => {
    const onRoll = vi.fn()
    render(<CreationRollAction {...props} pending={false} onRoll={onRoll} />)

    const trigger = screen.getByRole('button', { name: 'Roll characteristics' })
    await userEvent.click(trigger)
    await userEvent.keyboard('{Escape}')

    expect(onRoll).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('"Roll now" rolls once, stays open while pending with both buttons disabled, and closes after', async () => {
    const onRoll = vi.fn()
    const { rerender } = render(<CreationRollAction {...props} pending={false} onRoll={onRoll} />)

    await userEvent.click(screen.getByRole('button', { name: 'Roll characteristics' }))
    await userEvent.click(screen.getByRole('button', { name: 'Roll now' }))

    expect(onRoll).toHaveBeenCalledTimes(1)

    rerender(<CreationRollAction {...props} pending={true} onRoll={onRoll} />)
    expect(screen.getByRole('alertdialog', { name: 'Roll characteristics?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rolling...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Not yet' })).toBeDisabled()

    rerender(<CreationRollAction {...props} pending={false} onRoll={onRoll} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
