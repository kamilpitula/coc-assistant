import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { PresentPlayerActiveScene } from '@/scene-play/types/ActiveScene'
import type { PlayerReveal } from '@/scene-play/types/Reveal'

import { ActiveScenePlayerView } from './active-scene-player-view'

// specs/scene-play/ux.md sections 4 and 14; SPL-UX-12, SPL-UX-13, SPL-UX-26, SPL-UX-35, SPL-A11Y-1, SPL-A11Y-4, SPL-A11Y-8.
vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealFile: vi.fn() }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const reveal = (revealId: string, title: string, overrides: Partial<PlayerReveal> = {}): PlayerReveal => ({
  revealId,
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title,
  handoutKind: 'ReadAloud',
  content: { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [text(`Text of ${title}`)] }] } },
  file: null,
  imageDescription: null,
  ...overrides,
})

const present = (reveals: PlayerReveal[] = []): PresentPlayerActiveScene =>
  ({
    kind: 'present-player',
    reveals,
    title: 'The Corbitt House',
    location: 'Arkham, Boston Road',
    investigatorsPresent: [
      { name: 'Harvey Walters', isYours: true },
      { name: 'Lucy Ward', isYours: false },
    ],
  })

describe('ActiveScenePlayerView', () => {
  it('shows a present Player the title, location, who is present with their own marked, and the empty Reveals sentence', () => {
    render(<ActiveScenePlayerView campaignId="c1" scene={present()} />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeInTheDocument()
    expect(screen.getByText('Location').nextElementSibling).toHaveTextContent('Arkham, Boston Road')
    expect(screen.getByRole('region', { name: 'Investigators present' })).toBeInTheDocument()
    expect(screen.getByText('Harvey Walters (your Investigator)')).toBeInTheDocument()
    expect(screen.getByText('Lucy Ward')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Revealed to Harvey Walters' })).toBeInTheDocument()
    expect(screen.getByText("The Keeper hasn't revealed anything to Harvey Walters yet.")).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('links to the Player\'s own Clues under "Revealed to {name}" (SPL-UX-26)', () => {
    render(<ActiveScenePlayerView campaignId="c1" scene={present()} />)

    const section = screen.getByRole('region', { name: 'Revealed to Harvey Walters' })
    expect(within(section).getByRole('link', { name: "Harvey Walters's Clues" })).toHaveAttribute('href', '/campaigns/c1/investigator/clues')
  })

  it('lists the Reveals as articles labelled by their h3, with the kind and time, newest first as given, and no empty sentence (SPL-UX-26, SPL-A11Y-8)', () => {
    render(<ActiveScenePlayerView campaignId="c1" scene={present([reveal('r2', 'The cellar door'), reveal('r1', 'The front door', { handoutKind: 'Text' })])} />)

    const articles = screen.getAllByRole('article')
    expect(articles.map((article) => within(article).getByRole('heading', { level: 3 }).textContent)).toEqual(['The cellar door', 'The front door'])
    expect(within(articles[0]).getByText(/^Read-aloud.*Revealed/)).toBeInTheDocument()
    expect(within(articles[1]).getByText(/^Text.*Revealed/)).toBeInTheDocument()
    expect(within(articles[0]).getByText(/^Read-aloud.*Revealed/).querySelector('time')).toHaveAttribute('datetime', '2026-10-28T19:52:00Z')
    expect(within(articles[0]).getByText('Text of The cellar door')).toBeInTheDocument()
    expect(screen.queryByText(/hasn't revealed anything/)).not.toBeInTheDocument()
  })

  it('names a Non-Player Entity Reveal as such (SPL-UX-27)', () => {
    render(<ActiveScenePlayerView campaignId="c1" scene={present([reveal('r1', 'A nervous clerk', { subjectType: 'NonPlayerEntity', handoutKind: null })])} />)

    expect(within(screen.getByRole('article')).getByText(/Non-Player Entity/)).toBeInTheDocument()
  })

  it('omits the location when there is none and names an unnamed Investigator', () => {
    render(
      <ActiveScenePlayerView
        campaignId="c1"
        scene={{ kind: 'present-player', reveals: [], title: 'X', location: '', investigatorsPresent: [{ name: null, isYours: true }] }}
      />,
    )

    expect(screen.queryByText('Location')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Revealed to Unnamed Investigator' })).toBeInTheDocument()
  })

  it('shows any other Player only the title and that the Scene is in progress, with no Reveals or Clues link (SPL-UX-35)', () => {
    const { container } = render(<ActiveScenePlayerView campaignId="c1" scene={{ kind: 'absent-player', title: 'The Corbitt House' }} />)

    expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeInTheDocument()
    expect(screen.getByText("This Scene is in progress. You aren't taking part in it.")).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('dl, ul, time')).toBeNull()
  })
})
