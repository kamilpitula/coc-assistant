import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RequestChangesDialog } from './request-changes-dialog'

/** specs/character-sheet/ux.md section 7.1 "Request changes"; UX-15 and A11Y-8. */
describe('RequestChangesDialog', () => {
  it('opens a "Request changes" dialog with a labelled comment and a visible character counter', async () => {
    render(<RequestChangesDialog pending={false} onSend={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Request changes' }))

    expect(screen.getByRole('dialog', { name: 'Request changes' })).toBeInTheDocument()
    expect(screen.getByLabelText('What should the Player change?')).toHaveAttribute('maxLength', '2000')
    expect(screen.getByText('0 of 2000 characters')).toBeInTheDocument()
  })

  it('UX-15: cannot be sent without a comment', async () => {
    const onSend = vi.fn()
    render(<RequestChangesDialog pending={false} onSend={onSend} />)

    await userEvent.click(screen.getByRole('button', { name: 'Request changes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send to Player' }))

    expect(onSend).not.toHaveBeenCalled()
    const comment = screen.getByLabelText('What should the Player change?')
    expect(comment).toHaveAttribute('aria-invalid', 'true')
    expect(comment).toHaveAccessibleDescription(expect.stringContaining('Write what the Player should change.'))
  })

  it('sends the comment and closes once sent', async () => {
    const onSend = vi.fn().mockResolvedValue(true)
    render(<RequestChangesDialog pending={false} onSend={onSend} />)

    await userEvent.click(screen.getByRole('button', { name: 'Request changes' }))
    await userEvent.type(screen.getByLabelText('What should the Player change?'), 'Lower the Credit Rating')
    expect(screen.getByText('23 of 2000 characters')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send to Player' }))

    expect(onSend).toHaveBeenCalledWith('Lower the Credit Rating')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('A11Y-8: returns focus to "Request changes" when cancelled', async () => {
    render(<RequestChangesDialog pending={false} onSend={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Request changes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('button', { name: 'Request changes' })).toHaveFocus()
  })
})
