import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActiveScene } from '@/scene-play/types/ActiveScene'

import { ActiveSceneCard } from './active-scene-card'

// specs/scene-play/ux.md section 5; SPL-UX-13, SPL-UX-14, SPL-A11Y-1, SPL-A11Y-5.
const { mockUseActive, mockUseAnnouncement, refetch } = vi.hoisted(() => ({ mockUseActive: vi.fn(), mockUseAnnouncement: vi.fn(), refetch: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useActiveScene: mockUseActive }))
vi.mock('@/scene-play/hooks/useActiveSceneAnnouncement', () => ({ useActiveSceneAnnouncement: mockUseAnnouncement }))

const keeper: ActiveScene = {
  kind: 'keeper',
  sceneId: 's',
  scenarioId: 'p',
  scenarioTitle: 'T',
  title: 'The Corbitt House',
  location: 'Arkham, Boston Road',
  startedAt: null,
  investigatorsPresent: [{ id: 'a', name: 'Harvey Walters' }, { id: 'b', name: null }],
  reveals: [],
}
const present: ActiveScene = {
  kind: 'present-player',
  title: 'The Corbitt House',
  location: '',
  investigatorsPresent: [{ name: 'Harvey Walters', isYours: true }, { name: 'Lucy Ward', isYours: false }],
}
const absent: ActiveScene = { kind: 'absent-player', title: 'The Corbitt House' }

const query = (data: unknown, overrides: Record<string, unknown> = {}) => ({ data, isError: false, isFetchedAfterMount: true, refetch, ...overrides })

describe('ActiveSceneCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAnnouncement.mockReturnValue({ message: '', sequence: 0 })
  })

  it('shows the Keeper the title, location, who is present, and the link', () => {
    mockUseActive.mockReturnValue(query(keeper))
    render(<ActiveSceneCard campaignId="c1" isKeeper />)

    expect(screen.getByRole('region', { name: 'Active Scene' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Active Scene' })).toBeInTheDocument()
    expect(screen.getByText('The Corbitt House')).toBeInTheDocument()
    expect(screen.getByText('Arkham, Boston Road')).toBeInTheDocument()
    expect(screen.getByText('Investigators present: Harvey Walters, Unnamed Investigator')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Active Scene' })).toHaveAttribute('href', '/campaigns/c1/active-scene')
  })

  it('marks a present Player their own Investigator and omits an empty location', () => {
    mockUseActive.mockReturnValue(query(present))
    render(<ActiveSceneCard campaignId="c1" isKeeper={false} />)

    expect(screen.getByText('Investigators present: Harvey Walters (your Investigator), Lucy Ward')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Active Scene' })).toBeInTheDocument()
  })

  it('shows a Player who is not present only that the Scene is in progress, with no link', () => {
    mockUseActive.mockReturnValue(query(absent))
    render(<ActiveSceneCard campaignId="c1" isKeeper={false} />)

    expect(screen.getByText("The Corbitt House is in progress. You aren't taking part in it.")).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders no card while no Scene is Active or while loading', () => {
    mockUseActive.mockReturnValue(query(null))
    const { unmount } = render(<ActiveSceneCard campaignId="c1" isKeeper />)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    unmount()

    mockUseActive.mockReturnValue(query(undefined))
    render(<ActiveSceneCard campaignId="c1" isKeeper />)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('shows the error with a retry', async () => {
    mockUseActive.mockReturnValue(query(undefined, { isError: true }))
    render(<ActiveSceneCard campaignId="c1" isKeeper />)

    expect(screen.getByRole('region', { name: 'Active Scene' })).toHaveTextContent("We couldn't check for an Active Scene.")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('announces a start or a finish to Players, but not who is present, and nothing to the Keeper', () => {
    mockUseActive.mockReturnValue(query(absent))
    mockUseAnnouncement.mockReturnValue({ message: 'The Corbitt House started.', sequence: 1 })
    const { unmount } = render(<ActiveSceneCard campaignId="c1" isKeeper={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('The Corbitt House started.')
    unmount()

    mockUseAnnouncement.mockReturnValue({ message: "You're now taking part in The Corbitt House.", sequence: 2 })
    render(<ActiveSceneCard campaignId="c1" isKeeper={false} />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(mockUseAnnouncement).toHaveBeenLastCalledWith(absent, true)
  })

  it('gives the announcement hook nothing for the Keeper', () => {
    mockUseActive.mockReturnValue(query(keeper))
    render(<ActiveSceneCard campaignId="c1" isKeeper />)

    expect(mockUseAnnouncement).toHaveBeenCalledWith(undefined, true)
  })
})
