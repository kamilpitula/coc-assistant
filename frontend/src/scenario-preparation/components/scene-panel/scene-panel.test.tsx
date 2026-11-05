import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { thugHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import type { OpenPanel } from '@/shared/components/side-panel/sidePanelParams'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { routerState } from '@/shared/test-support/routerMock'

import { ScenePanel } from './scene-panel'

// specs/navigation/ux.md section 3 (PBI-SPL-005 design record D1): the Scene page hosts its panel, mapping the
// `handout` and `entity` panel types to the scene-scoped bodies with no `from`; `clues` and `reveal` open no panel.
const { mockUseSidePanel, mockUseHandout, mockUseScene, mockUseHumanNpc, sidePanelProps } = vi.hoisted(() => ({
  mockUseSidePanel: vi.fn(),
  mockUseHandout: vi.fn(),
  mockUseScene: vi.fn(),
  mockUseHumanNpc: vi.fn(),
  sidePanelProps: { current: null as null | Record<string, unknown> },
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/shared/hooks/useSidePanel', () => ({ useSidePanel: mockUseSidePanel }))
vi.mock('@/shared/components/side-panel/side-panel', () => ({
  SidePanel: (props: Record<string, unknown>) => {
    sidePanelProps.current = props
    return <div data-testid="side-panel">{props.children as React.ReactNode}</div>
  },
}))
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useHandout: mockUseHandout, useHandoutFile: vi.fn() }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntities', () => ({ useHumanNpc: mockUseHumanNpc, useMythosCreature: vi.fn() }))

const textHandout = {
  id: 'h1',
  kind: 'Text',
  visibility: 'PlayerFacing',
  title: 'A letter from Knott',
  content: { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'Come at once.', format: 0, style: '', detail: 0, mode: 'normal' }] }] } },
} as const
const npcLink = { id: 'l1', nonPlayerEntity: { id: 'n1', type: 'HumanNpc', name: 'Mr. Knott' }, playerFacingName: 'The man by the gate', playerFacingDescription: null }
const material = {
  id: 's1',
  title: 'The Corbitt House',
  status: 'Prepared',
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

function show(panel: OpenPanel | null) {
  mockUseSidePanel.mockReturnValue({ panel, open: vi.fn(), close })
  const headingRef = { current: null }

  render(
    <SidePanelScopeProvider>
      <ScenePanel campaignId="c1" scenarioId="p1" sceneId="s1" headingRef={headingRef} />
    </SidePanelScopeProvider>,
  )
  return { headingRef }
}

describe('ScenePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    sidePanelProps.current = null
    mockUseHandout.mockReturnValue(query(undefined))
    mockUseScene.mockReturnValue(query(undefined))
    mockUseHumanNpc.mockReturnValue(query(undefined))
  })

  it('opens the Handout body with the page h1 as the focus fallback, with no `from` on the full-page link', () => {
    mockUseHandout.mockReturnValue(query(textHandout))
    const { headingRef } = show({ type: 'handout', handoutId: 'h1' })

    expect(screen.getByTestId('side-panel')).toBeInTheDocument()
    expect(sidePanelProps.current?.open).toBe(true)
    expect(sidePanelProps.current?.fallbackRef).toBe(headingRef)
    expect(screen.getByRole('heading', { level: 2, name: 'A letter from Knott' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/scenarios/p1/scenes/s1/handouts/h1')
  })

  it('opens the entity body for an entity panel', () => {
    mockUseScene.mockReturnValue(query(material))
    mockUseHumanNpc.mockReturnValue(query(thugHumanNpc))
    show({ type: 'entity', linkId: 'l1' })

    expect(screen.getByRole('heading', { level: 2, name: 'The man by the gate' })).toBeInTheDocument()
  })

  it('opens no panel for a clues panel', () => {
    show({ type: 'clues', investigatorId: 'i1' })

    expect(screen.getByTestId('side-panel')).toBeInTheDocument()
    expect(sidePanelProps.current?.open).toBe(false)
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('opens no panel for a reveal panel', () => {
    show({ type: 'reveal', revealId: 'r1' })

    expect(screen.getByTestId('side-panel')).toBeInTheDocument()
    expect(sidePanelProps.current?.open).toBe(false)
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('opens no body without a panel', () => {
    show(null)

    expect(screen.getByTestId('side-panel')).toBeInTheDocument()
    expect(sidePanelProps.current?.open).toBe(false)
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('closes through the panel close', () => {
    mockUseHandout.mockReturnValue(query(textHandout))
    show({ type: 'handout', handoutId: 'h1' })

    ;(sidePanelProps.current?.onClose as () => void)()
    expect(close).toHaveBeenCalled()
  })
})
