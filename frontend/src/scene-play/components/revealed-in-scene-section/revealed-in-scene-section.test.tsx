import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { KeeperReveal } from '@/scene-play/types/Reveal'

import { RevealedInSceneSection } from './revealed-in-scene-section'

// specs/scene-play/ux.md section 12 (Revealed in this Scene); SPL-UX-22, SPL-UX-30, SPL-A11Y-8, SPL-A11Y-11.
vi.mock('@/scene-play/hooks/useReveals', () => ({ useRevealFile: vi.fn() }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const reveal = (revealId: string, title: string, overrides: Partial<KeeperReveal> = {}): KeeperReveal => ({
  revealId,
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title,
  handoutKind: 'ReadAloud',
  content: { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [text(`As revealed: ${title}`)] }] } },
  file: null,
  imageDescription: null,
  subjectId: `subject-${revealId}`,
  recipients: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: 'Lucy Ward' }],
  ...overrides,
})

describe('RevealedInSceneSection', () => {
  it('says nothing has been revealed yet when there are no Reveals', () => {
    render(<RevealedInSceneSection campaignId="c1" reveals={[]} />)

    expect(screen.getByRole('region', { name: 'Revealed in this Scene' })).toBeInTheDocument()
    expect(screen.getByText('Nothing has been revealed in this Scene yet.')).toBeInTheDocument()
  })

  it('lists the Reveals in the given order (newest first) with kind, time, and recipients on the meta line (SPL-UX-22)', () => {
    render(<RevealedInSceneSection campaignId="c1" reveals={[reveal('r2', 'A nervous clerk', { subjectType: 'NonPlayerEntity', handoutKind: null, recipients: [{ id: 'i1', name: 'Harvey Walters' }] }), reveal('r1', 'The front door')]} />)

    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByRole('heading', { level: 3 }).textContent)).toEqual(['A nervous clerk', 'The front door'])
    expect(within(items[0]).getByText(/Non-Player Entity/)).toHaveTextContent('to Harvey Walters')
    expect(within(items[1]).getByText(/Read-aloud/)).toHaveTextContent('to Harvey Walters and Lucy Ward')
    expect(items[1].querySelector('time')).toHaveAttribute('datetime', '2026-10-28T19:52:00Z')
  })

  it('shows what was revealed from the snapshot after "Show what was revealed", named by the title (SPL-UX-30, SPL-A11Y-11)', async () => {
    render(<RevealedInSceneSection campaignId="c1" reveals={[reveal('r1', 'The front door')]} />)

    const toggle = screen.getByRole('button', { name: 'Show what was revealed: The front door' })
    expect(toggle).toHaveTextContent('Show what was revealed')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('As revealed: The front door')).not.toBeInTheDocument()

    await userEvent.click(toggle)

    expect(screen.getByText('As revealed: The front door')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide what was revealed: The front door' })).toHaveTextContent('Hide what was revealed')
  })
})
