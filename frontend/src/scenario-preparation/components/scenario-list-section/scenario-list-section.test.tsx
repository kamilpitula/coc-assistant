import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StaleScenarioOrderError } from '@/scenario-preparation/services/scenarioApi'
import type { Scenario } from '@/scenario-preparation/types/Scenario'

import { ScenarioListSection } from './scenario-list-section'

// specs/scenario-preparation/ux.md sections 2 and 2.1; SP-UX-1, SP-UX-4, SP-UX-11 to SP-UX-14, SP-A11Y-1, SP-A11Y-8, SP-A11Y-9.

const { mockUseScenarios, mockUseReorder, mutate, refetch } = vi.hoisted(() => ({
  mockUseScenarios: vi.fn(),
  mockUseReorder: vi.fn(),
  mutate: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useScenarios', () => ({
  useScenarios: mockUseScenarios,
  useReorderScenarios: mockUseReorder,
}))

const haunting: Scenario = { id: 's1', title: 'The Haunting', keeperNotes: '' }
const edge: Scenario = { id: 's2', title: 'Edge of Darkness', keeperNotes: '' }
const masks: Scenario = { id: 's3', title: 'Masks', keeperNotes: '' }

function list(scenarios: Scenario[] | undefined, overrides: Record<string, unknown> = {}) {
  return { data: scenarios, isPending: false, isError: false, refetch, dataUpdatedAt: 1, ...overrides }
}

function showList(scenarios: Scenario[], dataUpdatedAt = 1) {
  mockUseScenarios.mockReturnValue(list(scenarios, { dataUpdatedAt }))
}

describe('ScenarioListSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseReorder.mockReturnValue({ mutate, isPending: false })
  })

  it('lists the Scenarios in order as links inside a section labelled by its heading (SP-UX-1, SP-A11Y-1)', () => {
    showList([haunting, edge])

    render(<ScenarioListSection campaignId="c1" />)

    const section = screen.getByRole('region', { name: 'Scenarios' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Scenarios' })).toBeInTheDocument()
    const items = within(within(section).getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByRole('link').textContent)).toEqual(['The Haunting', 'Edge of Darkness'])
    expect(within(items[1]).getByRole('link')).toHaveAttribute('href', '/campaigns/c1/scenarios/s2')
  })

  it('offers Create Scenario next to the heading', () => {
    showList([haunting])

    render(<ScenarioListSection campaignId="c1" />)

    expect(screen.getByRole('link', { name: 'Create Scenario' })).toHaveAttribute('href', '/campaigns/c1/scenarios/new')
  })

  it('says there are no Scenarios yet and still offers Create Scenario (SP-UX-1)', () => {
    showList([])

    render(<ScenarioListSection campaignId="c1" />)

    expect(screen.getByText('No Scenarios yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Scenario' })).toBeInTheDocument()
  })

  it('shows busy rows while loading', () => {
    mockUseScenarios.mockReturnValue(list(undefined, { isPending: true }))

    const { container } = render(<ScenarioListSection campaignId="c1" />)

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('offers to try again when the Scenarios cannot load', async () => {
    mockUseScenarios.mockReturnValue(list(undefined, { isError: true }))

    render(<ScenarioListSection campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load the Scenarios.")).toBeInTheDocument()
    expect(refetch).toHaveBeenCalled()
  })

  it('gives each row Move up and Move down except at the ends (SP-UX-11, SP-A11Y-8)', () => {
    showList([haunting, edge, masks])

    render(<ScenarioListSection campaignId="c1" />)

    expect(screen.queryByRole('button', { name: 'Move The Haunting up' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move The Haunting down' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move Edge of Darkness up' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move Edge of Darkness down' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move Masks up' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move Masks down' })).not.toBeInTheDocument()
  })

  it('has no move controls for a single Scenario (SP-UX-14)', () => {
    showList([haunting])

    render(<ScenarioListSection campaignId="c1" />)

    expect(screen.queryByRole('button', { name: /Move/ })).not.toBeInTheDocument()
  })

  it('sends the complete new order when a Scenario moves up, and shows no new order before the server confirms it', async () => {
    showList([haunting, edge, masks])

    render(<ScenarioListSection campaignId="c1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Move Edge of Darkness up' }))

    expect(mutate).toHaveBeenCalledWith(['s2', 's1', 's3'], expect.any(Object))
    const titles = within(screen.getByRole('list')).getAllByRole('link').map((link) => link.textContent)
    expect(titles).toEqual(['The Haunting', 'Edge of Darkness', 'Masks'])
  })

  it('announces a confirmed move and keeps focus on the same control (SP-UX-12, SP-A11Y-9)', async () => {
    showList([haunting, edge, masks])
    const { rerender } = render(<ScenarioListSection campaignId="c1" />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    await userEvent.click(screen.getByRole('button', { name: 'Move Masks up' }))
    const confirmed = [haunting, masks, edge]
    showList(confirmed, 2)
    act(() => mutate.mock.calls[0][1].onSuccess(confirmed))
    rerender(<ScenarioListSection campaignId="c1" />)

    expect(screen.getByRole('status')).toHaveTextContent('Masks moved to position 2 of 3.')
    expect(screen.getByRole('button', { name: 'Move Masks up' })).toHaveFocus()
  })

  it('moves focus to the other control when the Scenario became first or last (SP-UX-12)', async () => {
    showList([haunting, edge])
    const { rerender } = render(<ScenarioListSection campaignId="c1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Move Edge of Darkness up' }))
    const confirmed = [edge, haunting]
    showList(confirmed, 2)
    act(() => mutate.mock.calls[0][1].onSuccess(confirmed))
    rerender(<ScenarioListSection campaignId="c1" />)

    expect(screen.getByRole('status')).toHaveTextContent('Edge of Darkness moved to position 1 of 2.')
    expect(screen.getByRole('button', { name: 'Move Edge of Darkness down' })).toHaveFocus()
  })

  it('ignores activation while a move is saving and keeps the buttons focusable with aria-disabled (SP-UX-13)', async () => {
    showList([haunting, edge])
    mockUseReorder.mockReturnValue({ mutate, isPending: true })

    render(<ScenarioListSection campaignId="c1" />)
    const button = screen.getByRole('button', { name: 'Move Edge of Darkness up' })
    await userEvent.click(button)

    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('keeps the saved order and shows an alert when saving fails, then clears it at the next move (SP-UX-13)', async () => {
    showList([haunting, edge])
    render(<ScenarioListSection campaignId="c1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Move Edge of Darkness up' }))
    act(() => mutate.mock.calls[0][1].onError(new Error('boom')))

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't change the order. Try again.")
    expect(within(screen.getByRole('list')).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'The Haunting',
      'Edge of Darkness',
    ])

    await userEvent.click(screen.getByRole('button', { name: 'Move The Haunting down' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('explains a stale order and moves focus to the heading when the control is gone after the refetch (SP-UX-13)', async () => {
    showList([haunting, edge], 1)
    const { rerender } = render(<ScenarioListSection campaignId="c1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Move The Haunting down' }))
    act(() => mutate.mock.calls[0][1].onError(new StaleScenarioOrderError()))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Scenarios changed in another window. Check the order and try again.',
    )

    showList([edge], 2)
    rerender(<ScenarioListSection campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 2, name: 'Scenarios' })).toHaveFocus()
  })
})
