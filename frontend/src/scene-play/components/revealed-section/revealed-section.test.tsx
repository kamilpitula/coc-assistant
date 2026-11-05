import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { KeeperReveal } from '@/scene-play/types/Reveal'

import { RevealedSection } from './revealed-section'

// specs/scene-play/ux.md section 21.6; SPL-UX-46, SPL-A11Y-16.
const { mockUseSidePanelOpen } = vi.hoisted(() => ({
  mockUseSidePanelOpen: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/shared/hooks/useSidePanel', () => ({ useSidePanel: () => ({ open: mockUseSidePanelOpen }) }))

const reveal = (overrides: Partial<KeeperReveal> = {}): KeeperReveal => ({
  revealId: 'r1',
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title: 'The front door',
  handoutKind: 'ReadAloud',
  content: null,
  file: null,
  imageDescription: null,
  subjectId: 'h1',
  recipients: [{ id: 'i1', name: 'Harvey Walters' }],
  ...overrides,
})

describe('RevealedSection', () => {
  const renderSection = (reveals: KeeperReveal[] = []) => render(<RevealedSection reveals={reveals} />)

  it('lists Reveals newest first under the h2 and hint (SPL-UX-46)', () => {
    renderSection([
      reveal({ revealId: 'r2', title: 'A letter from Knott', revealedAt: '2026-10-28T19:58:00Z' }),
      reveal(),
    ])

    const section = screen.getByRole('region', { name: 'Revealed' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Revealed' })).toBeInTheDocument()
    expect(section).toHaveTextContent('Every Reveal in this Scene, newest first.')
    expect(within(section).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'A letter from Knott',
      'The front door',
    ])
  })

  it('opens the reveal panel for "Show what was revealed" (SPL-UX-46)', async () => {
    renderSection([reveal()])

    await userEvent.click(screen.getByRole('button', { name: 'Show what was revealed: The front door' }))

    expect(mockUseSidePanelOpen).toHaveBeenCalledTimes(1)
    expect(mockUseSidePanelOpen).toHaveBeenCalledWith({ type: 'reveal', revealId: 'r1' }, expect.any(HTMLElement))
  })

  it('says nothing has been revealed when the list is empty', () => {
    renderSection()

    expect(screen.getByText('Nothing has been revealed in this Scene yet.')).toBeInTheDocument()
  })
})
