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
  mockUseGiveItemFlow,
  mockUseTakeBackItemFlow,
  openSpy,
  confirmSpy,
  cancelSpy,
  returnFocusSpy,
  giveOpenSpy,
  giveConfirmSpy,
  giveCancelSpy,
  giveReturnFocusSpy,
  takeBackOpenSpy,
  takeBackConfirmSpy,
  takeBackCancelSpy,
  takeBackReturnFocusSpy,
  mockUseAnnouncement,
  refetch,
  headerProps,
  dialogProps,
  giveDialogProps,
  takeBackDialogProps,
  panelProps,
  playerProps,
} = vi.hoisted(() => ({
  mockUseCampaign: vi.fn(),
  mockUseActive: vi.fn(),
  mockUseScene: vi.fn(),
  mockUseRevealFlow: vi.fn(),
  mockUseGiveItemFlow: vi.fn(),
  mockUseTakeBackItemFlow: vi.fn(),
  openSpy: vi.fn(),
  confirmSpy: vi.fn(),
  cancelSpy: vi.fn(),
  returnFocusSpy: vi.fn(),
  giveOpenSpy: vi.fn(),
  giveConfirmSpy: vi.fn(),
  giveCancelSpy: vi.fn(),
  giveReturnFocusSpy: vi.fn(),
  takeBackOpenSpy: vi.fn(),
  takeBackConfirmSpy: vi.fn(),
  takeBackCancelSpy: vi.fn(),
  takeBackReturnFocusSpy: vi.fn(),
  mockUseAnnouncement: vi.fn(),
  refetch: vi.fn(),
  headerProps: { current: null as null | Record<string, unknown> },
  dialogProps: { current: null as null | Record<string, unknown> },
  giveDialogProps: { current: null as null | Record<string, unknown> },
  takeBackDialogProps: { current: null as null | Record<string, unknown> },
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
vi.mock('@/scene-play/hooks/useGiveItemFlow', () => ({ useGiveItemFlow: mockUseGiveItemFlow }))
vi.mock('@/scene-play/hooks/useTakeBackItemFlow', () => ({ useTakeBackItemFlow: mockUseTakeBackItemFlow }))
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
vi.mock('@/scene-play/components/give-item-dialog/give-item-dialog', () => ({
  GiveItemDialog: (props: Record<string, unknown>) => {
    giveDialogProps.current = props
    return null
  },
}))
vi.mock('@/scene-play/components/take-back-item-dialog/take-back-item-dialog', () => ({
  TakeBackItemDialog: (props: Record<string, unknown>) => {
    takeBackDialogProps.current = props
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
  itemLinks: [
    {
      id: 'il1',
      item: {
        id: 'item1',
        name: "Walter Corbitt's diary",
        holder: null,
        handouts: [
          { id: 'ih1', kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' },
          { id: 'ih2', kind: 'Text', visibility: 'KeeperFacing', title: 'The missing page' },
        ],
      },
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
    mockUseGiveItemFlow.mockReturnValue({ request: null, open: giveOpenSpy, confirm: giveConfirmSpy, cancel: giveCancelSpy, returnFocus: giveReturnFocusSpy, pending: false, refusal: null })
    mockUseTakeBackItemFlow.mockReturnValue({ request: null, open: takeBackOpenSpy, confirm: takeBackConfirmSpy, cancel: takeBackCancelSpy, returnFocus: takeBackReturnFocusSpy, pending: false, refusal: null })
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
    expect(within(nav).getByRole('link', { name: 'To reveal, 3' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Keeper reference, 4' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Revealed, 1' })).toBeInTheDocument()
    expect(screen.getByTestId('child-route')).toBeInTheDocument()
  })

  it('shows the compact header and the current sub-tab on a Keeper sub-route (SPL-UX-47)', () => {
    routerState.matches = [{ routeId: '/campaigns/$campaignId/active-scene/to-reveal' }]
    render(<ActiveScenePage campaignId="c1" />)

    expect(headerProps.current).toMatchObject({ compact: true })
    expect(screen.getByRole('link', { name: 'To reveal, 3' })).toHaveAttribute('aria-current', 'page')
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

  it('opens the give dialog from the tab and wires its callbacks to the give flow (SPL-UX-52)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    const request = { itemId: 'item1', itemName: "Walter Corbitt's diary", holder: null, triggerId: 'give-trigger-item1' }
    const context = { fallbackIds: ['item-link-item1'] }
    act(() => tabValue?.onGive(request, context))

    expect(giveOpenSpy).toHaveBeenCalledWith(request, context)

    mockUseGiveItemFlow.mockReturnValue({
      request,
      open: giveOpenSpy,
      confirm: giveConfirmSpy,
      cancel: giveCancelSpy,
      returnFocus: giveReturnFocusSpy,
      pending: true,
      refusal: 'That Investigator is no longer present or already holds it. Check the list and try again.',
    })
    render(<ActiveScenePage campaignId="c1" />)

    expect(giveDialogProps.current).toMatchObject({
      open: true,
      itemName: "Walter Corbitt's diary",
      holder: null,
      investigators: keeperScene.investigatorsPresent,
      pending: true,
      refusal: 'That Investigator is no longer present or already holds it. Check the list and try again.',
    })
    const callbacks = giveDialogProps.current as unknown as { onConfirm: (id: string) => void; onCancel: () => void; onCloseAutoFocus: (event: Event) => void }
    callbacks.onConfirm('i2')
    expect(giveConfirmSpy).toHaveBeenCalledWith('i2')
    callbacks.onCancel()
    expect(giveCancelSpy).toHaveBeenCalledTimes(1)
    const event = new Event('focus')
    callbacks.onCloseAutoFocus(event)
    expect(giveReturnFocusSpy).toHaveBeenCalledWith(event)
  })

  it('opens the take-back dialog from the tab and wires its callbacks to the take-back flow (SPL-UX-54)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    const request = { itemId: 'item1', itemName: "Walter Corbitt's diary", holderId: 'i1', holderName: 'Harvey Walters', triggerId: 'take-back-trigger-item1' }
    const context = { fallbackIds: ['give-trigger-item1'] }
    act(() => tabValue?.onTakeBack(request, context))

    expect(takeBackOpenSpy).toHaveBeenCalledWith(request, context)

    mockUseTakeBackItemFlow.mockReturnValue({
      request,
      open: takeBackOpenSpy,
      confirm: takeBackConfirmSpy,
      cancel: takeBackCancelSpy,
      returnFocus: takeBackReturnFocusSpy,
      pending: true,
      refusal: "We couldn't take Walter Corbitt's diary back. Try again.",
    })
    render(<ActiveScenePage campaignId="c1" />)

    expect(takeBackDialogProps.current).toMatchObject({
      open: true,
      itemName: "Walter Corbitt's diary",
      holderName: 'Harvey Walters',
      pending: true,
      refusal: "We couldn't take Walter Corbitt's diary back. Try again.",
    })
    const callbacks = takeBackDialogProps.current as unknown as { onConfirm: () => void; onCancel: () => void; onCloseAutoFocus: (event: Event) => void }
    callbacks.onConfirm()
    expect(takeBackConfirmSpy).toHaveBeenCalledTimes(1)
    callbacks.onCancel()
    expect(takeBackCancelSpy).toHaveBeenCalledTimes(1)
    const event = new Event('focus')
    callbacks.onCloseAutoFocus(event)
    expect(takeBackReturnFocusSpy).toHaveBeenCalledWith(event)
  })

  it('gives the give flow the Investigators present and their Reveals, and refetches after a refusal (SPL-UX-58)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    const [, present, reveals, callbacks] = mockUseGiveItemFlow.mock.calls[0] as [string, InvestigatorPresent[], KeeperReveal[], { onGiven: (message: string) => void; onRefetch: () => void }]
    expect(present).toEqual(keeperScene.investigatorsPresent)
    expect(reveals).toEqual(keeperScene.reveals)
    act(() => callbacks.onGiven("Walter Corbitt's diary given to Lucy Ward."))
    expect(screen.getByRole('status')).toHaveTextContent("Walter Corbitt's diary given to Lucy Ward.")
    act(() => callbacks.onRefetch())

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('says "{name} taken back from {holder}." after a take back (SPL-UX-54)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    const callbacks = mockUseTakeBackItemFlow.mock.calls[0][1] as { onTakenBack: (message: string) => void; onRefetch: () => void }
    act(() => callbacks.onTakenBack("Walter Corbitt's diary taken back from Harvey Walters."))

    expect(screen.getByRole('status')).toHaveTextContent("Walter Corbitt's diary taken back from Harvey Walters.")
  })

  it('moves focus to the heading when a give or take back found the Scene finished (SPL-UX-52, SPL-A11Y-9)', async () => {
    const { rerender } = render(<ActiveScenePage campaignId="c1" />)

    const giveCallbacks = mockUseGiveItemFlow.mock.calls[0][3] as { onRefetch: () => void }
    act(() => giveCallbacks.onRefetch())
    mockUseActive.mockReturnValue(query(null))
    rerender(<ActiveScenePage campaignId="c1" />)

    expect(refetch).toHaveBeenCalled()
    expect(await screen.findByRole('heading', { level: 1, name: 'No Active Scene' })).toHaveFocus()
  })

  it('says "{title} revealed to {names}." in the status region after the Keeper reveals (SPL-UX-22)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    const callbacks = mockUseRevealFlow.mock.calls[0][2] as { onRevealed: (message: string) => void }
    act(() => callbacks.onRevealed('The front door revealed to Harvey Walters.'))

    expect(screen.getByRole('status')).toHaveTextContent('The front door revealed to Harvey Walters.')
  })

  it('says "Investigators present saved." after a save with no cancelled roll (SPL-UX-71)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    act(() => tabValue?.onPresentSaved(0))

    expect(screen.getByRole('status')).toHaveTextContent('Investigators present saved.')
  })

  it('names how many waiting rolls the present save cancelled (SPL-UX-71)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    act(() => tabValue?.onPresentSaved(2))

    expect(screen.getByRole('status')).toHaveTextContent('Investigators present saved. 2 waiting rolls cancelled.')
  })

  it('says "{target} roll requested from {names}." after a request from Run (RR-UX-6)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    act(() => tabValue?.onRollRequested('Spot Hidden roll requested from Harvey Walters.'))

    expect(screen.getByRole('status')).toHaveTextContent('Spot Hidden roll requested from Harvey Walters.')
  })

  it('says "Wall Entry added." after a Wall post from Run (SPL-UX-49)', () => {
    render(<ActiveScenePage campaignId="c1" />)

    act(() => tabValue?.onWallEntryAdded())

    expect(screen.getByRole('status')).toHaveTextContent('Wall Entry added.')
  })

  it('passes the Wall add callback to the Player view, and says "Wall Entry added." after a Player post (SPL-UX-49)', () => {
    mockUseCampaign.mockReturnValue({ data: { id: 'c1', role: 'Player' } })
    mockUseActive.mockReturnValue(query(playerScene))
    render(<ActiveScenePage campaignId="c1" />)

    expect(playerProps.current).toMatchObject({ campaignId: 'c1', scene: playerScene })
    act(() => (playerProps.current?.onWallEntryAdded as () => void)())

    expect(screen.getByRole('status')).toHaveTextContent('Wall Entry added.')
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
