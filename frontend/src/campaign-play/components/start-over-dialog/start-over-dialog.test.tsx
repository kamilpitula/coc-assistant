import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StartOverDialog } from './start-over-dialog'

/** specs/character-sheet/ux.md section 5.5; UX-16 and A11Y-8. */
describe('StartOverDialog', () => {
  it('asks for confirmation with the safe action focused', async () => {
    render(<StartOverDialog onConfirm={vi.fn()} pending={false} />)

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Start over?' })
    expect(dialog).toHaveTextContent("This deletes your draft Investigator. You can't undo this.")
    expect(screen.getByRole('button', { name: 'Keep draft' })).toHaveFocus()
  })

  it('deletes only after "Delete draft" and returns focus to "Start over" when kept', async () => {
    const onConfirm = vi.fn()
    render(<StartOverDialog onConfirm={onConfirm} pending={false} />)

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }))
    await userEvent.click(screen.getByRole('button', { name: 'Keep draft' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Start over' })).toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: 'Start over' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete draft' }))
    expect(onConfirm).toHaveBeenCalled()
  })
})
