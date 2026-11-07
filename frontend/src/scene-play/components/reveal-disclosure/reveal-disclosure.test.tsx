import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { textReveal } from '@/scene-play/test-support/revealFixtures'

import { RevealDisclosure } from './reveal-disclosure'

// specs/scene-play/ux.md section 15 and section 23.2: one disclosure for Clues and Scene History; each Reveal closed
// until "Show", exactly as a Clue.
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealFile: vi.fn() }))

function metaLine() {
  return (
    <p className="text-sm text-muted-foreground">
      Text <span aria-hidden="true">&middot;</span> Revealed <time dateTime="2026-11-07T19:20:00Z">7 Nov 2026, 19:20</time>
    </p>
  )
}

describe('RevealDisclosure', () => {
  it('shows the title and its meta line with the content closed until "Show"', async () => {
    render(<RevealDisclosure campaignId="c1" reveal={textReveal} metaLine={metaLine()} />)

    expect(screen.getByRole('heading', { level: 3, name: 'A letter from Knott' })).toBeInTheDocument()
    expect(screen.getByText(/Revealed/)).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Show A letter from Knott' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Come at once.')).not.toBeInTheDocument()

    await userEvent.click(toggle)

    expect(screen.getByRole('button', { name: 'Hide A letter from Knott' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Come at once.')).toBeInTheDocument()
  })
})
