import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActiveScene } from '@/scene-play/types/ActiveScene'
import type { Clues } from '@/scene-play/types/Reveal'
import type { RevealOpenContext, RevealTarget } from '@/scene-play/hooks/useRevealFlow'
import { keeperReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import { knottHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import type { OpenPanel } from '@/shared/components/side-panel/sidePanelParams'
import { routerState } from '@/shared/test-support/routerMock'

import { ActiveScenePanel } from './active-scene-panel'

// specs/navigation/ux.md section 3 (refinements G2, G8): the Active Scene hosts its panel, which renders once the
// Active Scene query has loaded, dispatching each panel type to its body (PBI-NAV-002 design record D4).
const { mockUseActive, mockUseSidePanel, mockUseCampaign, mockUseMyClues, mockUseInvestigatorClues, mockUseHandout, mockUseScene, mockUseHumanNpc, mockUseItem, mockUseCampaignMembers, sidePanelProps } = vi.hoisted(() => ({
  mockUseActive: vi.fn(),
  mockUseSidePanel: vi.fn(),
  mockUseCampaign: vi.fn(),
  mockUseMyClues: vi.fn(),
  mockUseInvestigatorClues: vi.fn(),
  mockUseHandout: vi.fn(),
  mockUseScene: vi.fn(),
  mockUseHumanNpc: vi.fn(),
  mockUseItem: vi.fn(),
  mockUseCampaignMembers: vi.fn(),
  sidePanelProps: { current: null as null | Record<string, unknown> },
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useActiveScene: mockUseActive }))
vi.mock('@/shared/hooks/useSidePanel', () => ({ useSidePanel: mockUseSidePanel }))
vi.mock('@/shared/components/side-panel/side-panel', () => ({
  SidePanel: (props: Record<string, unknown>) => {
    sidePanelProps.current = props
    return <div data-testid="side-panel">{props.children as React.ReactNode}</div>
  },
}))
vi.mock('@/campaign-play/hooks/useCampaign', () => ({ useCampaign: mockUseCampaign }))
vi.mock('@/scene-play/hooks/useReveals', () => ({
  useMyClues: mockUseMyClues,
  useInvestigatorClues: mockUseInvestigatorClues,
  useRevealAnnouncement: () => ({ message: '', sequence: 0 }),
  useRevealFile: vi.fn(),
}))
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useHandout: mockUseHandout, useHandoutFile: vi.fn() }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntities', () => ({ useHumanNpc: mockUseHumanNpc, useMythosCreature: vi.fn() }))
vi.mock('@/scenario-preparation/hooks/useItems', () => ({ useItem: mockUseItem }))
vi.mock('@/campaign-play/hooks/useCampaignMembers', () => ({ useCampaignMembers: mockUseCampaignMembers }))

const keeperScene: ActiveScene = { kind: 'keeper', sceneId: 's', scenarioId: 'p', scenarioTitle: 'T', title: 'The Corbitt House', location: '', startedAt: null, investigatorsPresent: [], reveals: [] }
const clues: Clues = { investigatorName: 'Lucy Ward', clues: [] }
const textHandout = {
  id: 'h1',
  kind: 'Text',
  visibility: 'PlayerFacing',
  title: 'A letter from Knott',
  content: { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'Come at once.', format: 0, style: '', detail: 0, mode: 'normal' }] }] } },
} as const
const npcLink = { id: 'l1', nonPlayerEntity: { id: 'n1', type: 'HumanNpc', name: 'Mr. Knott' }, playerFacingName: 'The man by the gate', playerFacingDescription: null }
const itemLink = { id: 'l2', item: { id: 'k1', name: "Walter Corbitt's diary", holder: null, handouts: [] } }
const item = {
  id: 'k1',
  name: "Walter Corbitt's diary",
  playerFacingDescription: {
    root: {
      type: 'root',
      children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: "Walter Corbitt's diary.", format: 0, style: '', detail: 0, mode: 'normal' }] }],
    },
  },
  keeperNotes: null,
  holder: null,
  handouts: [],
  scenes: [],
}
const material = {
  id: 's',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: null,
  finishedAt: null,
  location: '',
  keeperNotes: null,
  nonPlayerEntityLinks: [npcLink],
  itemLinks: [],
  handouts: [],
}
const query = (data: unknown) => ({ data, isError: false, isFetchedAfterMount: true, refetch: vi.fn() })
const close = vi.fn()

function show(panel: OpenPanel | null, onReveal?: (target: RevealTarget, context: RevealOpenContext) => void) {
  mockUseSidePanel.mockReturnValue({ panel, open: vi.fn(), close })
  const headingRef = { current: null }

  render(
    <SidePanelScopeProvider>
      <ActiveScenePanel campaignId="c1" headingRef={headingRef} onReveal={onReveal} />
    </SidePanelScopeProvider>,
  )
  return { headingRef }
}

describe('ActiveScenePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    sidePanelProps.current = null
    mockUseActive.mockReturnValue(query(keeperScene))
    mockUseCampaign.mockReturnValue({ data: { role: 'Keeper' } })
    mockUseMyClues.mockReturnValue(query(undefined))
    mockUseInvestigatorClues.mockReturnValue(query(clues))
    mockUseHandout.mockReturnValue(query(undefined))
    mockUseScene.mockReturnValue(query(undefined))
    mockUseHumanNpc.mockReturnValue(query(undefined))
    mockUseItem.mockReturnValue(query(undefined))
    mockUseCampaignMembers.mockReturnValue(query([]))
  })

  it('dispatches the item panel to the Item body (SPL-UX-60)', () => {
    mockUseScene.mockReturnValue(query({ ...material, itemLinks: [itemLink] }))
    mockUseItem.mockReturnValue(query(item))
    show({ type: 'item', itemId: 'k1' })

    expect(screen.getByRole('heading', { level: 2, name: "Walter Corbitt's diary" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/items/k1?from=active-scene')
  })

  it('renders nothing until the Active Scene query has loaded (G8)', () => {
    mockUseActive.mockReturnValue(query(undefined))
    show({ type: 'clues', investigatorId: 'i1' })

    expect(screen.queryByTestId('side-panel')).not.toBeInTheDocument()
  })

  it('opens the Clues body with the page h1 as the focus fallback (NAV-UX-4)', () => {
    const { headingRef } = show({ type: 'clues', investigatorId: 'i1' })

    expect(screen.getByTestId('side-panel')).toBeInTheDocument()
    expect(sidePanelProps.current?.open).toBe(true)
    expect(sidePanelProps.current?.fallbackRef).toBe(headingRef)
    expect(screen.getByRole('heading', { level: 2, name: "Lucy Ward's Clues" })).toBeInTheDocument()
  })

  it('closes through the panel close', () => {
    show({ type: 'clues', investigatorId: 'i1' })

    ;(sidePanelProps.current?.onClose as () => void)()
    expect(close).toHaveBeenCalled()
  })

  it('opens no body without a panel', () => {
    show(null)

    expect(screen.getByTestId('side-panel')).toBeInTheDocument()
    expect(sidePanelProps.current?.open).toBe(false)
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('dispatches the handout panel to the Handout body', () => {
    mockUseHandout.mockReturnValue(query(textHandout))
    show({ type: 'handout', handoutId: 'h1' })

    expect(screen.getByRole('heading', { level: 2, name: 'A letter from Knott' })).toBeInTheDocument()
  })

  it('dispatches the entity panel to the entity body', () => {
    mockUseScene.mockReturnValue(query(material))
    mockUseHumanNpc.mockReturnValue(query(knottHumanNpc))
    show({ type: 'entity', linkId: 'l1' })

    expect(screen.getByRole('heading', { level: 2, name: 'The man by the gate' })).toBeInTheDocument()
  })

  it('dispatches the reveal panel to the reveal body, with no footer', () => {
    mockUseActive.mockReturnValue(query({ ...keeperScene, reveals: [keeperReveal(textReveal, 'h2', ['Lucy Ward'])] }))
    show({ type: 'reveal', revealId: 'story-text' })

    expect(screen.getByRole('heading', { level: 2, name: 'A letter from Knott' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
  })

  it('passes the reveal flow to the handout body (SPL-UX-21)', () => {
    mockUseActive.mockReturnValue(query({ ...keeperScene, investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }] }))
    mockUseHandout.mockReturnValue(query(textHandout))
    mockUseScene.mockReturnValue(
      query({ ...material, handouts: [{ id: 'h1', kind: 'Text', visibility: 'PlayerFacing', title: 'A letter from Knott' }] }),
    )
    show({ type: 'handout', handoutId: 'h1' }, vi.fn())

    expect(screen.getByRole('button', { name: 'Reveal A letter from Knott' })).toBeInTheDocument()
  })

  it('passes the reveal flow to the entity body (SPL-UX-21)', () => {
    mockUseActive.mockReturnValue(query({ ...keeperScene, investigatorsPresent: [{ id: 'i1', name: 'Harvey Walters' }] }))
    mockUseScene.mockReturnValue(query(material))
    mockUseHumanNpc.mockReturnValue(query(knottHumanNpc))
    show({ type: 'entity', linkId: 'l1' }, vi.fn())

    expect(screen.getByRole('button', { name: 'Reveal The man by the gate' })).toBeInTheDocument()
  })
})
