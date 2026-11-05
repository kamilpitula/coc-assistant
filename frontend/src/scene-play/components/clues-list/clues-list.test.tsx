import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Clue, Clues } from '@/scene-play/types/Reveal'
import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'

import { CluesList } from './clues-list'

// specs/navigation/ux.md section 3 (refinement G5) and specs/scene-play/ux.md section 15: the Clues page and the Clues
// panel render one extracted list. Without a provider the groups are h2 and the Clues h3; the panel offset (+1) makes
// them h3 and h4.
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealFile: vi.fn() }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const clue = (id: string, title: string, scene: { id: string; title: string }, revealedAt: string): Clue => ({
  revealId: id,
  revealedAt,
  subjectType: 'Handout',
  title,
  handoutKind: 'Text',
  content: { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [text(`Text of ${title}`)] }] } },
  file: null,
  imageDescription: null,
  scene,
})
const corbitt = { id: 's2', title: 'The Corbitt House' }
const knott = { id: 's1', title: 'Meeting Knott' }
const clues: Clues = {
  investigatorName: 'Harvey Walters',
  clues: [
    clue('r3', 'The cellar plan', corbitt, '2026-10-28T19:58:00Z'),
    clue('r2', 'The front door', corbitt, '2026-10-28T19:52:00Z'),
    clue('r1', 'A letter from Knott', knott, '2026-10-28T19:30:00Z'),
  ],
}

describe('CluesList', () => {
  it('groups the Clues by Scene, newest group first, each Clue an h3 closed until "Show"', async () => {
    render(<CluesList campaignId="c1" clues={clues} />)

    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['The Corbitt House', 'Meeting Knott'])
    const group = within(screen.getByRole('region', { name: 'The Corbitt House' }))
    expect(group.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['The cellar plan', 'The front door'])
    expect(screen.queryByText('Text of The front door')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show The front door' }))
    expect(screen.getByText('Text of The front door')).toBeInTheDocument()
  })

  it('says the Investigator has no Clues yet when there are none', () => {
    render(<CluesList campaignId="c1" clues={{ investigatorName: 'Harvey Walters', clues: [] }} />)

    expect(screen.getByText("Harvey Walters hasn't received any Clues yet.")).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('renders one level deeper inside a heading offset, for the panel (NAV-UX-4)', () => {
    render(
      <HeadingOffsetProvider value={1}>
        <CluesList campaignId="c1" clues={clues} />
      </HeadingOffsetProvider>,
    )

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['The Corbitt House', 'Meeting Knott'])
    const group = within(screen.getByRole('region', { name: 'The Corbitt House' }))
    expect(group.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent)).toEqual(['The cellar plan', 'The front door'])
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })
})
