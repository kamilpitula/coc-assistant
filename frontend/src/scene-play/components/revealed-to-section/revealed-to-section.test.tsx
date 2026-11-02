import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { entityReveal, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'

import { RevealedToSection } from './revealed-to-section'

// specs/scene-play/ux.md section 14; SPL-UX-26, SPL-UX-27, SPL-A11Y-8.
vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealFile: vi.fn() }))

describe('RevealedToSection', () => {
  it('is a section labelled by "Revealed to {name}" with a link to the Player\'s own Clues', () => {
    render(<RevealedToSection campaignId="c1" investigatorName="Harvey Walters" reveals={[]} />)

    const section = screen.getByRole('region', { name: 'Revealed to Harvey Walters' })
    expect(within(section).getByRole('link', { name: "Harvey Walters's Clues" })).toHaveAttribute('href', '/campaigns/c1/investigator/clues')
  })

  it('says the Keeper has revealed nothing when there are no Reveals', () => {
    render(<RevealedToSection campaignId="c1" investigatorName="Harvey Walters" reveals={[]} />)

    expect(screen.getByText("The Keeper hasn't revealed anything to Harvey Walters yet.")).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('lists each Reveal as an article labelled by its h3, with kind and time, in the given order', () => {
    render(<RevealedToSection campaignId="c1" investigatorName="Harvey Walters" reveals={[textReveal, readAloudReveal, entityReveal]} />)

    const articles = screen.getAllByRole('article')
    expect(articles.map((article) => within(article).getByRole('heading', { level: 3 }).textContent)).toEqual(['A letter from Knott', 'The front door', 'A shape in the cellar'])
    expect(within(articles[0]).getByText(/^Text.*Revealed/)).toBeInTheDocument()
    expect(within(articles[2]).getByText(/^Non-Player Entity.*Revealed/)).toBeInTheDocument()
    expect(articles[1].querySelector('time')).toHaveAttribute('datetime', readAloudReveal.revealedAt)
    expect(screen.queryByText(/hasn't revealed anything/)).not.toBeInTheDocument()
  })

  it('keeps the heading, link, titles, and meta lines inside the reading column', () => {
    render(<RevealedToSection campaignId="c1" investigatorName="Harvey Walters" reveals={[readAloudReveal]} />)

    const article = screen.getByRole('article')
    expect(within(article).getByRole('heading', { level: 3 })).toHaveClass('max-w-2xl')
    expect(within(article).getByText(/^Read-aloud.*Revealed/)).toHaveClass('max-w-2xl')
    expect(screen.getByRole('heading', { level: 2 }).parentElement).toHaveClass('max-w-2xl')
  })
})
