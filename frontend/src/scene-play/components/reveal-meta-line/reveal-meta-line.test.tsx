import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { keeperReveal, readAloudReveal } from '@/scene-play/test-support/revealFixtures'

import { RevealMetaLine } from './reveal-meta-line'

// specs/navigation/ux.md section 3 (reveal panel body): "{kind} . {time} . to {names}" under a Reveal's title.
describe('RevealMetaLine', () => {
  it('shows the kind, the time, and the recipients', () => {
    render(<RevealMetaLine reveal={keeperReveal(readAloudReveal, 'h1', ['Harvey Walters', 'Lucy Ward'])} />)

    const line = screen.getByText(/Read-aloud/)
    expect(line).toHaveTextContent('to Harvey Walters and Lucy Ward')
    expect(line.querySelector('time')).toHaveAttribute('datetime', '2026-10-28T19:52:00Z')
  })
})
