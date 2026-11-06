import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RevealTrigger } from './reveal-trigger'

// specs/scene-play/ux.md sections 13 and 21.7: the "Reveal..." trigger opening the reveal dialog.
describe('RevealTrigger', () => {
  it('reveals its subject on click (SPL-UX-21)', async () => {
    const onReveal = vi.fn()
    render(<RevealTrigger triggerId="reveal-trigger-h1" title="The front door" onReveal={onReveal} />)

    const button = screen.getByRole('button', { name: 'Reveal The front door' })
    expect(button).toHaveTextContent('Reveal...')
    expect(button).toHaveAttribute('id', 'reveal-trigger-h1')
    await userEvent.click(button)
    expect(onReveal).toHaveBeenCalledTimes(1)
  })
})
