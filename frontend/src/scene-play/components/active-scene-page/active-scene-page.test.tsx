import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActiveScene, InvestigatorPresent, KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import type { RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import { navigateSpy, routerState } from '@/shared/test-support/routerMock'

import { useActiveSceneTab, type ActiveSceneTabContextValue } from './active-scene-tab-context'
import { ActiveScenePage } from './active-scene-page'

// specs/scene-play/ux.md sections 3, 4, and 21; SPL-UX-40, 41, 42, 45, 47, 48, SPL-A11Y-3, 15, 16, 17, NAV-UX-4, D4.
const {
  mockUseCampaign,
  mockUseActive,
  mockUseScene,
  mockUseRevealFlow,
  openSpy,
  confirmSpy,
  cancelSpy,
  returnFocusSpy,
  mockUseAnnouncement,
  refetch,
  headerProps,
  dialogProps,
  panelProps,
  playerProps,
} = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseActive: vi.fn(),
  mockUseScene: vi.fn(),
  mockUseRevealFlow: vi.fn(),
  openSpy: vi.fn(),
  confirmSpy: vi.fn(),
  cancelSpy: vi.fn(),
  returnFocusSpy: vi.fn(),
  mockUseAnnouncement: vi.fn(),
  refetch: vi.fn(),
  headerProps: { current: null as null | Record<string, unknown> },
  dialogProps: { current: null as null | Record<string, unknown> },
  panelProps: { current: null as null | Record<string, unknown> },
  playerProps: { current: null as null | Record<string, unknown> },
}))

let tabValue: ActiveSceneTabContextValue | null = null
vi.mock('@tanstack/react-router', async () => {
  const actual = await import('@/shared/test-support/routerMock')
  return {
    ...actual.routerMock,
    Outlet: () => {
      tabValue = useActiveSceneTab()
      return <div data-testid="child-route" />
    },
  }
})
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useActiveScene: mockUseActive }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/scene-play/hooks/useRevealFlow', () => ({ useRevealFlow: mockUseRevealFlow }))
vi.mock('@/scene-play/hooks/useActiveSceneAnnouncement', () => ({ useActiveSceneAnnouncement: mockUseAnnouncement }))
vi.mock('@/scene-play/components/active-scene-panel/active-scene-panel', async () => {
  const { useSidePanelScope } = await import('@/shared/components/side-panel/side-panel-scope-context')
  return {
    ActiveScenePanel: (props: { campaignId: string; headingRef: { current: unknown } }) => {
      panelProps.current = props
      useSidePanelScope()
      return null
    },
  }
})
vi.mock('@/scene-play/components/active-scene-header/active-scene-header', () => ({
  ActiveSceneHeader: (props: { scene: KeeperActiveScene; headingRef: React.Ref<HTMLHeadingElement>; compact: boolean }) => {
    headerProps.current = props as unknown as Record<string, unknown>
    return (
      <h1 ref={props.headingRef} tabIndex={-1}>
        {props.scene.title}
      </h1>
    )
  },
}))
vi.mock('@/scene-play/components/reveal-dialog/reveal-dialog', () => ({
  RevealDialog: (props: Record<string, unknown>) => {
    dialogProps.current = props
    return null
  },
}))
vi.mock('@/scene-play/components/active-scene-player-view/active-scene-player-view', () => ({
  ActiveScenePlayerView: (props: Record<string, unknown>) => {
    playerProps.current = props
    return <div data-testid="player-view" />
  },
}))

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
  recipients: [
    { id: 'i1', name: 'Harvey Walters' },
    { id: 'i2', name: 'Lucy Ward' },
  ],
  ...overrides,
})

const keeperScene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [
    { id: 'i1', name: 'Harvey Walters' },
    { id: 'i2', name: 'Lucy Ward' },
  ],
  reveals: [
    reveal(),
    reveal({ revealId: 'r2', subjectId: 'l1', subjectType: 'NonPlayerEntity', title: 'The landlord', handoutKind: null, recipients: [{ id: 'i1', name: 'Harvey Walters' }] }),
  ],
}

const material = {
  handouts: [
    { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' },
    { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: "Corbitt's true nature" },
  ],
  nonPlayerEntityLinks: [
    {
      id: 'l1',
      nonPlayerEntity: { id: 'n1', type: 'HumanNpc', name: 'Mr. Knott' },
      playerFacingName: 'The landlord',
      playerFacingDescription: null,
    },
  ],
}

const playerScene: ActiveScene = { kind: 'absent-player', title: 'The Corbitt House' }

const query = (data: unknown, overrides: Record<string, unknown> = {}) => ({ data, isError: false, isFetchedAfterMount: true, refetch, ...overrides })
const runRoute = '/campaigns/$campaignId/active-scene/'

describe('ActiveScenePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tabValue = null
    routerState.location.search = {}
    routerState.location.state = {}
    routerState.matches = [{ routeId: runRoute }]
    headerProps.current = null
    dialogProps.current = null
    panelProps.current = null
    playerProps.current = null
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Keeper' } })
    mockUseActive.mockReturnValue(query(keeperScene))
    mockUseScene.mockReturnValue({ data: material, isError: false })
    mockUseRevealFlow.mockReturnValue({ target: null, open: openSpy, confirm: confirmSpy, cancel: cancelSpy, returnFocus: returnFocusSpy, pending: false, refusal: null })
    mockUseAnnouncement.mockReturnValue({ message: '', sequence: 0 })
  })

  it('hosts the side panel in the page scope with the page h1 as the focus fallback (NAV-UX-4, D4)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    expect(panelProps.current?.campaignId).toBe('c1')
    expect((panelProps.current?.headingRef as { current: unknown } | undefined)?.current).toBe(
      screen.getByRole('heading', { name: 'The Corbitt House' }),
    )
  })

  it('shows the full header, the nav with live counts, and the Run tab on the Run route (SPL-UX-40, 41, 47)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    expect(headerProps.current).toMatchObject({ campaignId: 'c1', scene: keeperScene, compact: false })
    const nav = screen.getByRole('navigation', { name: 'Active Scene' })
    expect(within(nav).getByRole('link', { name: 'Run' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'To reveal, 1' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Keeper reference, 2' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Revealed, 2' })).toBeInTheDocument()
    expect(screen.getByTestId('child-route')).toBeInTheDocument()
  })

  it('shows the compact header and the current sub-tab on a Keeper sub-route (SPL-UX-47)', () => {
    routerState.matches = [{ routeId: '/campaigns/$campaignId/active-scene/to-reveal' }]
    render(<ActiveScenePage campaignId="c1" />)

    expect(headerProps.current).toMatchObject({ compact: true })
    expect(screen.getByRole('link', { name: 'To reveal, 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('child-route')).toBeInTheDocument()
  })

  it('renders the nav without counts while the material is still loading', () => {
    mockUseScene.mockReturnValue({ data: undefined, isError: false })
    render(<ActiveScenePage campaignId="c1" />)

    expect(screen.getByRole('link', { name: 'Run' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'To reveal' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'To reveal, 1' })).not.toBeInTheDocument()
  })

  it.each([
    ['/campaigns/$campaignId/active-scene/to-reveal', playerScene],
    ['/campaigns/$campaignId/active-scene/reference', playerScene],
    ['/campaigns/$campaignId/active-scene/revealed', playerScene],
    ['/campaigns/$campaignId/active-scene/to-reveal', null],
    ['/campaigns/$campaignId/active-scene/reference', null],
    ['/campaigns/$campaignId/active-scene/revealed', null],
  ])('redirects a Player or no Scene on %s to Run, replacing history (SPL-UX-48)', (routeId, scene) => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: scene === null ? 'Keeper' : 'Player' } })
    mockUseActive.mockReturnValue(query(scene))
    routerState.matches = [{ routeId }]
    render(<ActiveScenePage campaignId="c1" />)

    expect(navigateSpy).toHaveBeenCalledWith({ to: '/campaigns/$campaignId/active-scene', params: { campaignId: 'c1' }, replace: true })
    expect(screen.queryByTestId('child-route')).not.toBeInTheDocument()
  })

  it('shows No Active Scene to the Keeper on Run without redirecting', () => {
    mockUseActive.mockReturnValue(query(null))
    render(<ActiveScenePage campaignId="c1" />)

    expect(screen.getByRole('heading', { level: 1, name: 'No Active Scene' })).toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('shows a Player their view on Run, without sub-navigation (SPL-UX-48)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    mockUseActive.mockReturnValue(query(playerScene))
    render(<ActiveScenePage campaignId="c1" />)

    expect(playerProps.current).toMatchObject({ campaignId: 'c1', scene: playerScene })
    expect(screen.getByTestId('player-view')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Active Scene' })).not.toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('shows the navigation message in the status region', () => {
    routerState.location.state = { statusMessage: 'The Corbitt House started.' }
    render(<ActiveScenePage campaignId="c1" />)

    expect(screen.getByRole('status')).toHaveTextContent('The Corbitt House started.')
  })

  it('gives the announcement hook nothing for the Keeper', () => {
    render(<ActiveScenePage campaignId="c1" />)

    expect(mockUseAnnouncement).toHaveBeenCalledWith(undefined, true)
  })

  it('announces a Reveal that arrives after the first load politely to the Player, and nothing on the first load (SPL-UX-28)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    const withReveals = (titles: string[]): ActiveScene => ({
      kind: 'present-player',
      title: 'The Corbitt House',
      location: '',
      investigatorsPresent: [{ name: 'Harvey', isYours: true }],
      reveals: titles.map((title, index) => ({
        revealId: `r${index}`,
        revealedAt: '2026-10-28T19:52:00Z',
        subjectType: 'Handout',
        title,
        handoutKind: 'Text',
        content: null,
        file: null,
        imageDescription: null,
      })),
    }) as ActiveScene
    mockUseActive.mockReturnValue(query(withReveals([])))
    const { container, rerender } = render(<ActiveScenePage campaignId="c1" />)
    expect(container.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement()

    mockUseActive.mockReturnValue(query(withReveals(['The front door'])))
    rerender(<ActiveScenePage campaignId="c1" />)

    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('New for Harvey: The front door.')
  })

  it('opens the reveal dialog from the tab and wires its callbacks to the flow (SPL-UX-21)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    const target: RevealTarget = { subjectType: 'Handout', subjectId: 'h1', title: 'The front door', summary: 'Read-aloud', triggerId: 'reveal-trigger-h1' }
    const context = { alreadyRevealedIds: ['i1'], fallbackIds: [] }
    act(() => tabValue?.onReveal(target, context))

    expect(openSpy).toHaveBeenCalledWith(target, context)

    mockUseRevealFlow.mockReturnValue({
      target,
      open: openSpy,
      confirm: confirmSpy,
      cancel: cancelSpy,
      returnFocus: returnFocusSpy,
      pending: true,
      refusal: 'One of these Investigators is no longer present. Check the list and try again.',
    })
    render(<ActiveScenePage campaignId="c1" />)

    expect(dialogProps.current).toMatchObject({
      open: true,
      title: 'The front door',
      summary: 'Read-aloud',
      investigators: keeperScene.investigatorsPresent,
      pending: true,
      refusal: { message: 'One of these Investigators is no longer present. Check the list and try again.' },
    })
    expect(dialogProps.current?.alreadyRevealedIds).toEqual(new Set(['i1', 'i2']))
    const callbacks = dialogProps.current as unknown as { onConfirm: (ids: string[]) => void; onCancel: () => void; onCloseAutoFocus: (event: Event) => void }
    callbacks.onConfirm(['i1'])
    expect(confirmSpy).toHaveBeenCalledWith(['i1'])
    callbacks.onCancel()
    expect(cancelSpy).toHaveBeenCalledTimes(1)
    const event = new Event('focus')
    callbacks.onCloseAutoFocus(event)
    expect(returnFocusSpy).toHaveBeenCalledWith(event)
  })

  it('passes the reveal flow to the side panel (SPL-UX-21)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    expect(panelProps.current?.onReveal).toBe(openSpy)
  })

  it('says "{title} revealed to {names}." in the status region after the Keeper reveals (SPL-UX-22)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    const callbacks = mockUseRevealFlow.mock.calls[0][2] as { onRevealed: (message: string) => void }
    act(() => callbacks.onRevealed('The front door revealed to Harvey Walters.'))

    expect(screen.getByRole('status')).toHaveTextContent('The front door revealed to Harvey Walters.')
  })

  it('says "Investigators present saved." after a save', () => {
    render(<ActiveScenePage campaignId="c1" />)

    act(() => tabValue?.onPresentSaved())

    expect(screen.getByRole('status')).toHaveTextContent('Investigators present saved.')
  })

  it('refetches when a present change found the Scene finished', () => {
    render(<ActiveScenePage campaignId="c1" />)

    act(() => tabValue?.onFinishedMeanwhile())

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('gives the reveal flow the Investigators present and refetches after a 400 refusal', () => {
    render(<ActiveScenePage campaignId="c1" />)

    const [, present, callbacks] = mockUseRevealFlow.mock.calls[0] as [string, InvestigatorPresent[], { onRefetch: () => void }]
    expect(present).toEqual(keeperScene.investigatorsPresent)
    act(() => callbacks.onRefetch())

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('keeps the reveal message and moves focus to the heading when the Scene finished meanwhile (SPL-UX-22, SPL-A11Y-9)', async () => {
    const { rerender } = render(<ActiveScenePage campaignId="c1" />)

    const callbacks = mockUseRevealFlow.mock.calls[0][2] as { onRevealed: (message: string) => void }
    act(() => callbacks.onRevealed('The front door revealed to Harvey Walters.'))
    mockUseActive.mockReturnValue(query(null))
    rerender(<ActiveScenePage campaignId="c1" />)

    expect(screen.getByRole('status')).toHaveTextContent('The front door revealed to Harvey Walters.')
    expect(await screen.findByRole('heading', { level: 1, name: 'No Active Scene' })).toHaveFocus()
  })

  it('refetches and focuses the heading when the Scene was finished while the reveal dialog was open (SPL-UX-24)', async () => {
    const { rerender } = render(<ActiveScenePage campaignId="c1" />)

    const callbacks = mockUseRevealFlow.mock.calls[0][2] as { onSceneFinished: () => void }
    act(() => callbacks.onSceneFinished())
    mockUseActive.mockReturnValue(query(null))
    rerender(<ActiveScenePage campaignId="c1" />)

    expect(refetch).toHaveBeenCalled()
    expect(await screen.findByRole('heading', { level: 1, name: 'No Active Scene' })).toHaveFocus()
  })

  it('says "{title} finished." and moves focus to the heading after the Keeper finishes the Scene', async () => {
    const { rerender } = render(<ActiveScenePage campaignId="c1" />)

    const header = headerProps.current as unknown as { onFinished: (title: string) => void }
    header.onFinished('The Corbitt House')
    mockUseActive.mockReturnValue(query(null))
    rerender(<ActiveScenePage campaignId="c1" />)

    expect(await screen.findByRole('status')).toHaveTextContent('The Corbitt House finished.')
    expect(screen.getByRole('heading', { level: 1, name: 'No Active Scene' })).toHaveFocus()
  })

  it('says the Scene was already finished and refetches when the finish found none Active', async () => {
    render(<ActiveScenePage campaignId="c1" />)

    const header = headerProps.current as unknown as { onAlreadyFinished: () => void }
    header.onAlreadyFinished()

    expect(await screen.findByText('This Scene was already finished.')).toBeInTheDocument()
    expect(refetch).toHaveBeenCalledTimes(1)
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
