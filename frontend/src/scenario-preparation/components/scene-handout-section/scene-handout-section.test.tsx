import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StaleHandoutOrderError } from '@/scenario-preparation/services/handoutApi'
import type { HandoutSummary } from '@/scenario-preparation/types/Handout'

import { SceneHandoutSection } from './scene-handout-section'

// specs/scenario-preparation/ux.md section 41; SP-UX-64, SP-UX-65, SP-UX-67, SP-UX-70, SP-UX-72, SP-UX-73, SP-UX-75, SP-A11Y-37,
// SP-A11Y-38, SP-A11Y-40, SP-A11Y-41, SP-A11Y-42, SP-A11Y-43.

const { mockUseReorder, reorderMutate } = vi.hoisted(() => ({ mockUseReorder: vi.fn(), reorderMutate: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useReorderHandouts: mockUseReorder }))

const door: HandoutSummary = { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' }
const truth: HandoutSummary = { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: "Corbitt's true nature" }
const cellar: HandoutSummary = { id: 'h3', kind: 'ReadAloud', visibility: 'KeeperFacing', title: 'The cellar' }

const reordering = (overrides: Record<string, unknown> = {}) => ({ mutate: reorderMutate, isPending: false, ...overrides })

function renderSection(overrides: Partial<Parameters<typeof SceneHandoutSection>[0]> = {}) {
  return render(
    <SceneHandoutSection
      campaignId="c1"
      scenarioId="s1"
      sceneId="a1"
      status="Prepared"
      handouts={[door, truth, cellar]}
      sceneUpdatedAt={1}
      {...overrides}
    />,
  )
}

describe('SceneHandoutSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseReorder.mockReturnValue(reordering())
  })

  it('lists each Handout in stored order as a link to its page with its kind and visibility as text (SP-UX-64, SP-UX-67, SP-A11Y-37)', () => {
    renderSection()

    const section = screen.getByRole('region', { name: 'Handouts' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Handouts' })).toBeInTheDocument()
    expect(
      within(section).getByText('Player-facing Handouts reach Players only when you reveal them. Keeper-facing Handouts are never revealed.'),
    ).toBeInTheDocument()
    const items = within(within(section).getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByRole('link', { name: /^(The front door|Corbitt|The cellar)/ }).textContent)).toEqual([
      'The front door',
      "Corbitt's true nature",
      'The cellar',
    ])
    expect(within(items[0]).getByRole('link', { name: 'The front door' })).toHaveAttribute(
      'href',
      '/campaigns/c1/scenarios/s1/scenes/a1/handouts/h1',
    )
    expect(items[0]).toHaveTextContent('Read-aloud')
    expect(items[0]).toHaveTextContent('Player-facing')
    expect(items[1]).toHaveTextContent('Text')
    expect(items[1]).toHaveTextContent('Keeper-facing')
  })

  it('says there are no Handouts yet and still offers Add Handout (SP-UX-64)', () => {
    renderSection({ handouts: [] })

    expect(screen.getByText('No Handouts yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add Handout' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a1/handouts/new')
  })

  it.each(['Prepared', 'Active'] as const)('offers Add Handout and the move buttons, named by title, on a %s Scene (SP-UX-72, SP-A11Y-42)', (status) => {
    renderSection({ status })

    expect(screen.getByRole('link', { name: 'Add Handout' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move The front door down' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move The front door up' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Move Corbitt's true nature up" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Move Corbitt's true nature down" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move The cellar up' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move The cellar down' })).not.toBeInTheDocument()
  })

  it('shows the list of a Finished Scene without Add Handout or move buttons (SP-UX-73)', () => {
    renderSection({ status: 'Finished' })

    expect(screen.getByRole('link', { name: 'The front door' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Add Handout' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Move / })).not.toBeInTheDocument()
  })

  it('has no move buttons for a single Handout, and none are announced on first load (SP-A11Y-41)', () => {
    renderSection({ handouts: [door] })

    expect(screen.queryByRole('button', { name: /^Move / })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('wraps a long title instead of overflowing (SP-A11Y-43)', () => {
    renderSection({ handouts: [{ ...door, title: 'x'.repeat(200) }] })

    expect(screen.getByRole('link', { name: 'x'.repeat(200) })).toHaveClass('break-words')
  })

  describe('moving (SP-UX-70)', () => {
    it('sends the complete new order when a Handout is moved down', async () => {
      renderSection()

      await userEvent.click(screen.getByRole('button', { name: 'Move The front door down' }))

      expect(reorderMutate).toHaveBeenCalledWith(['h2', 'h1', 'h3'], expect.any(Object))
    })

    it('announces the confirmed move politely and moves focus to the control that was used (SP-A11Y-41)', async () => {
      reorderMutate.mockImplementation((_ids: string[], options: { onSuccess: (updated: HandoutSummary[]) => void }) =>
        options.onSuccess([truth, door, cellar]),
      )
      const { rerender } = renderSection()

      await userEvent.click(screen.getByRole('button', { name: 'Move The front door down' }))
      rerender(
        <SceneHandoutSection campaignId="c1" scenarioId="s1" sceneId="a1" status="Prepared" handouts={[truth, door, cellar]} sceneUpdatedAt={2} />,
      )

      expect(screen.getByRole('status')).toHaveTextContent('The front door moved to position 2 of 3.')
      await waitFor(() => expect(screen.getByRole('button', { name: 'Move The front door down' })).toHaveFocus())
    })

    it('alerts when the move fails (SP-UX-70)', async () => {
      reorderMutate.mockImplementation((_ids: string[], options: { onError: (error: Error) => void }) => options.onError(new Error('boom')))
      renderSection()

      await userEvent.click(screen.getByRole('button', { name: 'Move The front door down' }))

      expect(screen.getByRole('alert')).toHaveTextContent("We couldn't change the order. Try again.")
    })

    it('says the Handouts changed in another window when the order is stale', async () => {
      reorderMutate.mockImplementation((_ids: string[], options: { onError: (error: Error) => void }) =>
        options.onError(new StaleHandoutOrderError()),
      )
      renderSection()

      await userEvent.click(screen.getByRole('button', { name: 'Move The front door down' }))

      expect(screen.getByRole('alert')).toHaveTextContent('The Handouts changed in another window. Check the order and try again.')
    })

    it('marks every move button aria-disabled, not disabled, while a move is saving (SP-UX-75)', () => {
      mockUseReorder.mockReturnValue(reordering({ isPending: true }))
      renderSection()

      const button = screen.getByRole('button', { name: 'Move The front door down' })
      expect(button).toHaveAttribute('aria-disabled', 'true')
      expect(button).not.toBeDisabled()
    })
  })

  describe('focus (SP-A11Y-40)', () => {
    it('moves focus to the new Handout link once it is listed', async () => {
      const { rerender } = renderSection({ handouts: [door], focusHandoutId: 'h2' })
      expect(screen.getByRole('link', { name: 'The front door' })).not.toHaveFocus()

      rerender(
        <SceneHandoutSection
          campaignId="c1"
          scenarioId="s1"
          sceneId="a1"
          status="Prepared"
          handouts={[door, truth]}
          sceneUpdatedAt={2}
          focusHandoutId="h2"
        />,
      )

      await waitFor(() => expect(screen.getByRole('link', { name: "Corbitt's true nature" })).toHaveFocus())
    })

    it('moves focus to the Handouts heading after a delete', () => {
      renderSection({ focusHeading: true })

      expect(screen.getByRole('heading', { level: 2, name: 'Handouts' })).toHaveFocus()
    })
  })
})
