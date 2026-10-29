import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NoActiveSceneError } from '@/scene-play/services/activeSceneApi'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'

import { ActiveSceneKeeperView } from './active-scene-keeper-view'

// specs/scene-play/ux.md section 3; SPL-UX-9, SPL-UX-11, SPL-UX-18, SPL-A11Y-1, SPL-A11Y-3, SPL-A11Y-4.
const { mockUseFinish, finishMutate, finishReset } = vi.hoisted(() => ({ mockUseFinish: vi.fn(), finishMutate: vi.fn(), finishReset: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useFinishActiveScene: mockUseFinish }))
vi.mock('@/scene-play/components/investigators-present-section/investigators-present-section', () => ({
  InvestigatorsPresentSection: () => <section aria-label="Investigators present stub" />,
}))

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: 'Arkham, Boston Road',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }],
  reveals: [],
}

const finishing = (overrides: Record<string, unknown> = {}) => ({ mutate: finishMutate, reset: finishReset, isPending: false, isError: false, error: null, ...overrides })

describe('ActiveSceneKeeperView', () => {
  const onFinished = vi.fn()
  const onAlreadyFinished = vi.fn()
  const renderView = () =>
    render(
      <ActiveSceneKeeperView
        campaignId="c1"
        scene={scene}
        headingRef={{ current: null }}
        onFinished={onFinished}
        onAlreadyFinished={onAlreadyFinished}
        onPresentSaved={vi.fn()}
        onRefetch={vi.fn()}
      />,
    )

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseFinish.mockReturnValue(finishing())
  })

  it('shows the title, Active status, start time, Scenario with its link, and location, but no Keeper notes or Handouts', () => {
    renderView()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Started').parentElement?.querySelector('time')).toHaveAttribute('datetime', '2026-10-28T19:40:00Z')
    expect(screen.getByText('Scenario: The Haunting')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open in Scenario' })).toHaveAttribute('href', '/campaigns/c1/scenarios/p1/scenes/s1')
    expect(screen.getByText('Location').nextElementSibling).toHaveTextContent('Arkham, Boston Road')
    expect(screen.queryByText(/Keeper notes|Handouts/)).not.toBeInTheDocument()
  })

  it('omits the location when there is none', () => {
    render(<ActiveSceneKeeperView campaignId="c1" scene={{ ...scene, location: '' }} headingRef={{ current: null }} onFinished={onFinished} onAlreadyFinished={onAlreadyFinished} onPresentSaved={vi.fn()} onRefetch={vi.fn()} />)

    expect(screen.queryByText('Location')).not.toBeInTheDocument()
  })

  it('finishes after confirmation and tells the page the title', async () => {
    renderView()

    await userEvent.click(screen.getByRole('button', { name: 'Finish Scene' }))
    expect(screen.getByRole('alertdialog', { name: 'Finish The Corbitt House?' })).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finish Scene' }))
    finishMutate.mock.calls[0][1].onSuccess()

    expect(finishMutate).toHaveBeenCalledTimes(1)
    expect(onFinished).toHaveBeenCalledWith('The Corbitt House')
  })

  it('keeps the Scene Active when the dialog is cancelled, and returns focus to Finish Scene', async () => {
    renderView()

    await userEvent.click(screen.getByRole('button', { name: 'Finish Scene' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(finishMutate).not.toHaveBeenCalled()
    expect(onFinished).not.toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Finish Scene' })).toHaveFocus()
  })

  it('tells the page when the Scene had already been finished elsewhere (409)', async () => {
    renderView()

    await userEvent.click(screen.getByRole('button', { name: 'Finish Scene' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finish Scene' }))
    finishMutate.mock.calls[0][1].onError(new NoActiveSceneError())

    expect(onAlreadyFinished).toHaveBeenCalledTimes(1)
    expect(onFinished).not.toHaveBeenCalled()
  })

  it('shows a failure inside the dialog and disables the buttons while finishing', async () => {
    mockUseFinish.mockReturnValue(finishing({ isError: true, error: new Error('boom') }))
    renderView()

    await userEvent.click(screen.getByRole('button', { name: 'Finish Scene' }))

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't finish the Scene. Try again.")
  })

  it('reads "Finishing..." and disables the confirm button while in flight', async () => {
    mockUseFinish.mockReturnValue(finishing({ isPending: true }))
    renderView()

    await userEvent.click(screen.getByRole('button', { name: 'Finish Scene' }))

    expect(screen.getByRole('button', { name: 'Finishing...' })).toBeDisabled()
  })
})
