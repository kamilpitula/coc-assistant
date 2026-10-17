import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RemoveRowButton } from './remove-row-button'

// specs/scenario-preparation/ux.md section 25.2; SP-A11Y-21.

describe('RemoveRowButton', () => {
  it('is a button named for its row, at least 40 by 40 pixels', async () => {
    const onClick = vi.fn()
    render(<RemoveRowButton label="Remove skill Spot Hidden" onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Remove skill Spot Hidden' })
    expect(button).toHaveClass('size-10')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalled()
  })
})
