import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActiveScene, KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { Handout } from '@/scenario-preparation/types/Handout'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { routerState } from '@/shared/test-support/routerMock'

import { HandoutPanel } from './handout-panel'

// specs/navigation/ux.md section 3 (refinements G2, G5, G6, G8): the handout panel reads the Handout of the Keeper's Active
// Scene, shows its badges and current content from h3, and links to the full page with ?from=active-scene.
const { mockUseActive, mockUseHandout, refetch } = vi.hoisted(() => ({
  mockUseActive: vi.fn(),
  mockUseHandout: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useActiveScene: mockUseActive }))
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useHandout: mockUseHandout, useHandoutFile: vi.fn() }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const content = {
  root: {
    type: 'root' as const,
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('Inside')] },
      { type: 'paragraph', version: 1, children: [text('The door creaks open.')] },
    ],
  },
}
const handout: Handout = { id: 'h1', kind: 'Text', visibility: 'PlayerFacing', title: 'A letter from Knott', content }
const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 's1',
  scenarioId: 'p1',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [],
  reveals: [],
}
const activeQuery = (data: ActiveScene | null | undefined) => ({ data, isError: false, isFetchedAfterMount: true, refetch: vi.fn() })
const handoutQuery = (data: Handout | null | undefined, overrides: Record<string, unknown> = {}) => ({ data, isError: false, refetch, ...overrides })

function show(handoutId = 'h1') {
  return render(
    <SidePanelScopeProvider>
      <HandoutPanel campaignId="c1" handoutId={handoutId} />
    </SidePanelScopeProvider>,
  )
}

describe('HandoutPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseActive.mockReturnValue(activeQuery(scene))
    mockUseHandout.mockReturnValue(handoutQuery(handout))
  })

  it('shows the kind line, the title, the badges, and the content from h3, with the full-page link (NAV-UX-4, NAV-UX-7)', () => {
    show()

    expect(screen.getByText('Handout')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'A letter from Knott' })).toBeInTheDocument()
    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByText('Player-facing')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Inside' })).toBeInTheDocument()
    expect(screen.getByText('The door creaks open.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/scenarios/p1/scenes/s1/handouts/h1?from=active-scene')
  })

  it("loads the Handout of the Keeper's Active Scene", () => {
    show()

    expect(mockUseHandout).toHaveBeenCalledWith({ type: 'scene', campaignId: 'c1', scenarioId: 'p1', sceneId: 's1' }, 'h1', true)
  })

  it('says the subject was not found for an unknown Handout, with no footer (NAV-UX-9)', () => {
    mockUseHandout.mockReturnValue(handoutQuery(null))
    show('unknown')

    expect(screen.getByRole('heading', { level: 2, name: 'Handout' })).toBeInTheDocument()
    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
  })

  it('shows the kind label, a Skeleton while loading, and retries on a failure', async () => {
    mockUseHandout.mockReturnValue(handoutQuery(undefined))
    const { rerender } = show()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()

    mockUseHandout.mockReturnValue(handoutQuery(undefined, { isError: true }))
    rerender(
      <SidePanelScopeProvider>
        <HandoutPanel campaignId="c1" handoutId="h1" />
      </SidePanelScopeProvider>,
    )
    expect(screen.getByText("We couldn't load this.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('says the subject was not found for a Player, sending no Handout request (NAV-UX-9)', () => {
    mockUseActive.mockReturnValue(activeQuery({ kind: 'present-player', title: 'The Corbitt House', location: '', investigatorsPresent: [], reveals: [] }))
    show()

    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(mockUseHandout).not.toHaveBeenCalled()
  })

  it('says the subject was not found when no Scene is Active, sending no Handout request (NAV-UX-9)', () => {
    mockUseActive.mockReturnValue(activeQuery(null))
    show()

    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(mockUseHandout).not.toHaveBeenCalled()
  })
})
