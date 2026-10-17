import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StaleSceneOrderError } from '@/scenario-preparation/services/sceneApi'
import type { SceneSummary } from '@/scenario-preparation/types/Scene'

import { SceneListSection } from './scene-list-section'

// specs/scenario-preparation/ux.md section 12; SP-UX-15, SP-UX-21, SP-UX-24, SP-A11Y-10, SP-A11Y-11, SP-A11Y-16.

const { mockUseScenes, mockUseReorder, mutate, refetch } = vi.hoisted(() => ({
  mockUseScenes: vi.fn(),
  mockUseReorder: vi.fn(),
  mutate: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({
  useScenes: mockUseScenes,
  useReorderScenes: mockUseReorder,
}))

const scene = (id: string, title: string, overrides: Partial<SceneSummary> = {}): SceneSummary => ({
  id,
  title,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  ...overrides,
})

const knott = scene('a1', 'Meeting Knott')
const corbitt = scene('a2', 'The Corbitt House', { status: 'Active', startedAt: '2026-10-12T19:40:00Z' })
const cellar = scene('a3', 'The Cellar', { status: 'Finished', startedAt: '2026-10-12T19:40:00Z', finishedAt: '2026-10-12T21:05:00Z' })

function list(scenes: SceneSummary[] | undefined, overrides: Record<string, unknown> = {}) {
  return { data: scenes, isPending: false, isError: false, refetch, dataUpdatedAt: 1, ...overrides }
}

function showList(scenes: SceneSummary[], dataUpdatedAt = 1) {
  mockUseScenes.mockReturnValue(list(scenes, { dataUpdatedAt }))
}

const renderSection = () => render(<SceneListSection campaignId="c1" scenarioId="s1" />)

describe('SceneListSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseReorder.mockReturnValue({ mutate, isPending: false })
  })

  it('lists the Scenes in order as links inside a section labelled by its h2, in an ordered list (SP-UX-15, SP-A11Y-10)', () => {
    showList([knott, corbitt])

    renderSection()

    const section = screen.getByRole('region', { name: 'Scenes' })
    expect(within(section).getByRole('heading', { level: 2, name: 'Scenes' })).toBeInTheDocument()
    const items = within(within(section).getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByRole('link').textContent)).toEqual(['Meeting Knott', 'The Corbitt House'])
    expect(within(items[1]).getByRole('link')).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/a2')
  })

  it('shows every Scene status as text, and times only once they are set (SP-UX-21, SP-A11Y-11)', () => {
    showList([knott, corbitt, cellar])

    renderSection()

    const items = screen.getAllByRole('listitem')
    expect(within(items[0]).getByText('Prepared')).toBeInTheDocument()
    expect(within(items[0]).queryByText(/Started|Finished \d/)).not.toBeInTheDocument()
    expect(within(items[1]).getByText('Active')).toBeInTheDocument()
    expect(within(items[1]).getByText(/Started/)).toBeInTheDocument()
    expect(within(items[1]).queryByText(/^Finished/)).not.toBeInTheDocument()
    expect(within(items[2]).getByText('Finished', { selector: 'span.inline-flex' })).toBeInTheDocument()
    expect(within(items[2]).getAllByText(/Started|Finished/).length).toBeGreaterThan(2)
  })

  it('offers Create Scene next to the heading', () => {
    showList([knott])

    renderSection()

    expect(screen.getByRole('link', { name: 'Create Scene' })).toHaveAttribute('href', '/campaigns/c1/scenarios/s1/scenes/new')
  })

  it('says there are no Scenes yet and still offers Create Scene (SP-UX-15)', () => {
    showList([])

    renderSection()

    expect(screen.getByText('No Scenes yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create Scene' })).toBeInTheDocument()
  })

  it('shows busy rows while loading', () => {
    mockUseScenes.mockReturnValue(list(undefined, { isPending: true }))

    const { container } = renderSection()

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('offers to try again when the Scenes cannot load', async () => {
    mockUseScenes.mockReturnValue(list(undefined, { isError: true }))

    renderSection()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText("We couldn't load the Scenes.")).toBeInTheDocument()
    expect(refetch).toHaveBeenCalled()
  })

  it('gives every Scene move controls whatever its status, except at the ends (SP-UX-24)', () => {
    showList([knott, corbitt, cellar])

    renderSection()

    expect(screen.queryByRole('button', { name: 'Move Meeting Knott up' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move The Corbitt House up' })).toHaveAttribute('id', 'move-scene-up-a2')
    expect(screen.getByRole('button', { name: 'Move The Corbitt House down' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move The Cellar up' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move The Cellar down' })).not.toBeInTheDocument()
  })

  it('has no move controls for a single Scene', () => {
    showList([knott])

    renderSection()

    expect(screen.queryByRole('button', { name: /Move/ })).not.toBeInTheDocument()
  })

  it('sends the complete new order when a Scene moves up, and shows no new order before the server confirms it', async () => {
    showList([knott, corbitt, cellar])

    renderSection()
    await userEvent.click(screen.getByRole('button', { name: 'Move The Corbitt House up' }))

    expect(mutate).toHaveBeenCalledWith(['a2', 'a1', 'a3'], expect.any(Object))
    expect(within(screen.getByRole('list')).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Meeting Knott',
      'The Corbitt House',
      'The Cellar',
    ])
  })

  it('announces a confirmed move in one polite region and keeps focus on the same control (SP-A11Y-16)', async () => {
    showList([knott, corbitt, cellar])
    const { rerender } = renderSection()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    await userEvent.click(screen.getByRole('button', { name: 'Move The Cellar up' }))
    const confirmed = [knott, cellar, corbitt]
    showList(confirmed, 2)
    act(() => mutate.mock.calls[0][1].onSuccess(confirmed))
    rerender(<SceneListSection campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('status')).toHaveTextContent('The Cellar moved to position 2 of 3.')
    expect(screen.getByRole('button', { name: 'Move The Cellar up' })).toHaveFocus()
  })

  it('ignores activation while a move is saving and keeps the buttons focusable with aria-disabled', async () => {
    showList([knott, corbitt])
    mockUseReorder.mockReturnValue({ mutate, isPending: true })

    renderSection()
    const button = screen.getByRole('button', { name: 'Move The Corbitt House up' })
    await userEvent.click(button)

    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('shows an alert when saving the order fails and keeps the saved order', async () => {
    showList([knott, corbitt])
    renderSection()

    await userEvent.click(screen.getByRole('button', { name: 'Move The Corbitt House up' }))
    act(() => mutate.mock.calls[0][1].onError(new Error('boom')))

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't change the order. Try again.")
    expect(within(screen.getByRole('list')).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Meeting Knott',
      'The Corbitt House',
    ])
  })

  it('explains a stale order with Scene wording and focuses the heading when the control is gone', async () => {
    showList([knott, corbitt], 1)
    const { rerender } = renderSection()

    await userEvent.click(screen.getByRole('button', { name: 'Move Meeting Knott down' }))
    act(() => mutate.mock.calls[0][1].onError(new StaleSceneOrderError()))
    expect(await screen.findByRole('alert')).toHaveTextContent('The Scenes changed in another window. Check the order and try again.')

    showList([corbitt], 2)
    rerender(<SceneListSection campaignId="c1" scenarioId="s1" />)

    expect(screen.getByRole('heading', { level: 2, name: 'Scenes' })).toHaveFocus()
  })
})
