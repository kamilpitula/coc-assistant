import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActiveScene } from '@/scene-play/types/ActiveScene'
import type { Clues } from '@/scene-play/types/Reveal'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import type { OpenPanel } from '@/shared/components/side-panel/sidePanelParams'
import { routerState } from '@/shared/test-support/routerMock'

import { ActiveScenePanel } from './active-scene-panel'

// specs/navigation/ux.md section 3 (refinements G2, G8): the Active Scene hosts its panel, which renders once the
// Active Scene query has loaded. The handout, entity, and reveal bodies arrive in phase 4; until then only clues opens.
const { mockUseActive, mockUseSidePanel, mockUseCampaign, mockUseMyClues, mockUseInvestigatorClues, sidePanelProps } = vi.hoisted(() => ({
  mockUseActive: vi.fn(),
  mockUseSidePanel: vi.fn(),
  mockUseCampaign: vi.fn(),
  mockUseMyClues: vi.fn(),
  mockUseInvestigatorClues: vi.fn(),
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

const keeperScene: ActiveScene = { kind: 'keeper', sceneId: 's', scenarioId: 'p', scenarioTitle: 'T', title: 'The Corbitt House', location: '', startedAt: null, investigatorsPresent: [], reveals: [] }
const clues: Clues = { investigatorName: 'Lucy Ward', clues: [] }
const query = (data: unknown) => ({ data, isError: false, isFetchedAfterMount: true, refetch: vi.fn() })
const close = vi.fn()

function show(panel: OpenPanel | null) {
  mockUseSidePanel.mockReturnValue({ panel, open: vi.fn(), close })
  const headingRef = { current: null }

  render(
    <SidePanelScopeProvider>
      <ActiveScenePanel campaignId="c1" headingRef={headingRef} />
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

  it('opens nothing for a panel type whose body is not built yet', () => {
    show({ type: 'handout', handoutId: 'h1' })

    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })
})
