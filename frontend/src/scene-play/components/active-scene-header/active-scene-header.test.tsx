import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NoActiveSceneError } from '@/scene-play/services/activeSceneApi'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'

import { ActiveSceneHeader } from './active-scene-header'

// specs/scene-play/ux.md section 21.2; SPL-UX-47, SPL-A11Y-16.
const { mockUseFinish, finishMutate, finishReset } = vi.hoisted(() => ({ mockUseFinish: vi.fn(), finishMutate: vi.fn(), finishReset: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useFinishActiveScene: mockUseFinish }))

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

describe('ActiveSceneHeader', () => {
  const onFinished = vi.fn()
  const onAlreadyFinished = vi.fn()
  const renderHeader = (compact = false) =>
    render(
      <ActiveSceneHeader
        campaignId="c1"
        scene={scene}
        compact={compact}
        headingRef={{ current: null }}
        onFinished={onFinished}
        onAlreadyFinished={onAlreadyFinished}
      />,
    )

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseFinish.mockReturnValue(finishing())
  })

  it('shows the title, Active status, and start time on one heading, with "Finish Scene" beside it (SPL-UX-47)', () => {
    renderHeader()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'The Corbitt House' })).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Started').parentElement?.querySelector('time')).toHaveAttribute('datetime', '2026-10-28T19:40:00Z')
    expect(screen.getByRole('button', { name: 'Finish Scene' })).toBeInTheDocument()
  })

  it('shows the Scenario with its link and the location on Run only (SPL-UX-47)', () => {
    const { unmount } = renderHeader(false)

    expect(screen.getByText('Scenario: The Haunting')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open in Scenario' })).toHaveAttribute('href', '/campaigns/c1/scenarios/p1/scenes/s1')
    expect(screen.getByText('Location').nextElementSibling).toHaveTextContent('Arkham, Boston Road')
    unmount()

    renderHeader(true)

    expect(screen.queryByText('Scenario: The Haunting')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open in Scenario' })).not.toBeInTheDocument()
    expect(screen.queryByText('Location')).not.toBeInTheDocument()
  })

  it('omits the location when there is none', () => {
    render(
      <ActiveSceneHeader
        campaignId="c1"
        scene={{ ...scene, location: '' }}
        compact={false}
        headingRef={{ current: null }}
        onFinished={onFinished}
        onAlreadyFinished={onAlreadyFinished}
      />,
    )

    expect(screen.queryByText('Location')).not.toBeInTheDocument()
  })

  it('finishes after confirmation and tells the page the title', async () => {
    renderHeader(true)

    await userEvent.click(screen.getByRole('button', { name: 'Finish Scene' }))
    expect(screen.getByRole('alertdialog', { name: 'Finish The Corbitt House?' })).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finish Scene' }))
    finishMutate.mock.calls[0][1].onSuccess()

    expect(finishMutate).toHaveBeenCalledTimes(1)
    expect(onFinished).toHaveBeenCalledWith('The Corbitt House')
  })

  it('keeps the Scene Active when the dialog is cancelled, and returns focus to Finish Scene', async () => {
    renderHeader()

    await userEvent.click(screen.getByRole('button', { name: 'Finish Scene' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(finishMutate).not.toHaveBeenCalled()
    expect(onFinished).not.toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Finish Scene' })).toHaveFocus()
  })

  it('tells the page when the Scene had already been finished elsewhere (409)', async () => {
    renderHeader()

    await userEvent.click(screen.getByRole('button', { name: 'Finish Scene' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finish Scene' }))
    finishMutate.mock.calls[0][1].onError(new NoActiveSceneError())

    expect(onAlreadyFinished).toHaveBeenCalledTimes(1)
    expect(onFinished).not.toHaveBeenCalled()
  })

  it('shows a failure inside the dialog and reads "Finishing..." while in flight', async () => {
    mockUseFinish.mockReturnValue(finishing({ isPending: true, isError: true, error: new Error('boom') }))
    renderHeader()

    await userEvent.click(screen.getByRole('button', { name: 'Finish Scene' }))

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't finish the Scene. Try again.")
    expect(screen.getByRole('button', { name: 'Finishing...' })).toBeDisabled()
  })
})
