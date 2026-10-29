import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActiveScene } from '@/scene-play/types/ActiveScene'
import { routerState } from '@/shared/test-support/routerMock'

import { ActiveScenePage } from './active-scene-page'

// specs/scene-play/ux.md sections 3 and 4; SPL-UX-9, 11, 12, 13, 15, SPL-A11Y-3, SPL-A11Y-5.
const { mockUseCampaign, mockUseActive, mockUseAnnouncement, refetch, keeperProps } = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseActive: vi.fn(),
  mockUseAnnouncement: vi.fn(),
  refetch: vi.fn(),
  keeperProps: { current: null as null | Record<string, (...args: string[]) => void> },
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useActiveScene: mockUseActive }))
vi.mock('@/scene-play/hooks/useActiveSceneAnnouncement', () => ({ useActiveSceneAnnouncement: mockUseAnnouncement }))
vi.mock('@/scene-play/components/active-scene-keeper-view/active-scene-keeper-view', () => ({
  ActiveSceneKeeperView: (props: Record<string, (...args: string[]) => void> & { headingRef: React.Ref<HTMLHeadingElement> }) => {
    keeperProps.current = props
    return <h1 ref={props.headingRef} tabIndex={-1}>Keeper view</h1>
  },
}))

const keeperScene: ActiveScene = { kind: 'keeper', sceneId: 's', scenarioId: 'p', scenarioTitle: 'T', title: 'The Corbitt House', location: '', startedAt: null, investigatorsPresent: [], reveals: [] }
const present: ActiveScene = { kind: 'present-player', title: 'The Corbitt House', location: '', investigatorsPresent: [{ name: 'Harvey', isYours: true }] }
const absent: ActiveScene = { kind: 'absent-player', title: 'The Corbitt House' }

const query = (data: unknown, overrides: Record<string, unknown> = {}) => ({ data, isError: false, isFetchedAfterMount: true, refetch, ...overrides })

describe('ActiveScenePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseActive.mockReturnValue(query(keeperScene))
    mockUseAnnouncement.mockReturnValue({ message: '', sequence: 0 })
  })

  it('shows the Keeper view to the Keeper, with the navigation message in the status region', () => {
    routerState.location.state = { statusMessage: 'The Corbitt House started.' }
    render(<ActiveScenePage campaignId="c1" />)

    expect(screen.getByRole('heading', { name: 'Keeper view' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('The Corbitt House started.')
  })

  it('shows a present Player their view and any other Player the title only', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    mockUseActive.mockReturnValue(query(present))
    const { unmount } = render(<ActiveScenePage campaignId="c1" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Revealed to Harvey' })).toBeInTheDocument()
    unmount()

    mockUseActive.mockReturnValue(query(absent))
    render(<ActiveScenePage campaignId="c1" />)
    expect(screen.getByText("This Scene is in progress. You aren't taking part in it.")).toBeInTheDocument()
  })

  it('shows No Active Scene to both roles when nothing is Active', () => {
    mockUseActive.mockReturnValue(query(null))
    render(<ActiveScenePage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'No Active Scene' })).toBeInTheDocument()
    expect(screen.getByText('Start a Scene from its page in a Scenario.')).toBeInTheDocument()
  })

  it("announces a Player's changes in the polite status region, and never the Keeper's", () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    mockUseActive.mockReturnValue(query(absent))
    mockUseAnnouncement.mockReturnValue({ message: "You're now taking part in The Corbitt House.", sequence: 1 })
    render(<ActiveScenePage campaignId="c1" />)

    expect(screen.getByRole('status')).toHaveTextContent("You're now taking part in The Corbitt House.")
    expect(mockUseAnnouncement).toHaveBeenCalledWith(absent, true)
  })

  it('gives the announcement hook nothing for the Keeper', () => {
    render(<ActiveScenePage campaignId="c1" />)

    expect(mockUseAnnouncement).toHaveBeenCalledWith(undefined, true)
  })

  it('says "{title} finished." and moves focus to the heading after the Keeper finishes the Scene', async () => {
    const { rerender } = render(<ActiveScenePage campaignId="c1" />)

    keeperProps.current!.onFinished('The Corbitt House')
    mockUseActive.mockReturnValue(query(null))
    rerender(<ActiveScenePage campaignId="c1" />)

    expect(await screen.findByRole('status')).toHaveTextContent('The Corbitt House finished.')
    expect(screen.getByRole('heading', { level: 1, name: 'No Active Scene' })).toHaveFocus()
  })

  it('says the Scene was already finished and refetches when the finish found none Active', async () => {
    render(<ActiveScenePage campaignId="c1" />)

    keeperProps.current!.onAlreadyFinished()

    expect(await screen.findByText('This Scene was already finished.')).toBeInTheDocument()
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('says "Investigators present saved." after a save', async () => {
    render(<ActiveScenePage campaignId="c1" />)

    keeperProps.current!.onPresentSaved()

    expect(await screen.findByText('Investigators present saved.')).toBeInTheDocument()
  })

  it('shows a busy skeleton while loading and a retry when loading fails', async () => {
    mockUseActive.mockReturnValue(query(undefined, { isFetchedAfterMount: false }))
    const { container, unmount } = render(<ActiveScenePage campaignId="c1" />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    unmount()

    mockUseActive.mockReturnValue(query(undefined, { isError: true }))
    render(<ActiveScenePage campaignId="c1" />)
    expect(screen.getByText("We couldn't load the Active Scene.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
