import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActiveScene, KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import type { Handout, HandoutSummary } from '@/scenario-preparation/types/Handout'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { routerState } from '@/shared/test-support/routerMock'

import { HandoutPanel } from './handout-panel'

// specs/navigation/ux.md section 3 (refinements G2, G5, G6, G8): the handout panel reads the Handout of the Keeper's Active
// Scene, shows its badges and current content from h3, and links to the full page with ?from=active-scene.
const { mockUseActive, mockUseHandout, mockUseScene, onReveal, refetch } = vi.hoisted(() => ({
  mockUseActive: vi.fn(),
  mockUseHandout: vi.fn(),
  mockUseScene: vi.fn(),
  onReveal: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useActiveScene: mockUseActive }))
vi.mock('@/scenario-preparation/hooks/useHandouts', () => ({ useHandout: mockUseHandout, useHandoutFile: vi.fn() }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))

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
const materialQuery = (handouts: HandoutSummary[], itemLinks: { id: string; item: { id: string; name: string; holder: null; handouts: HandoutSummary[] } }[] = []) => ({
  data: { handouts, itemLinks },
  isError: false,
  refetch,
})

const investigatorsPresent = [
  { id: 'i1', name: 'Harvey Walters' },
  { id: 'i2', name: 'Lucy Ward' },
]

function handoutReveal(recipientIds: string[]): KeeperReveal {
  return {
    revealId: `r-h1-${recipientIds.join('-')}`,
    revealedAt: '2026-10-28T19:52:00Z',
    subjectType: 'Handout',
    title: 'A letter from Knott',
    handoutKind: 'Text',
    content: null,
    file: null,
    imageDescription: null,
    subjectId: 'h1',
    recipients: investigatorsPresent.filter((investigator) => recipientIds.includes(investigator.id)),
  }
}

function show(handoutId = 'h1', reveal?: typeof onReveal) {
  return render(
    <SidePanelScopeProvider>
      <HandoutPanel campaignId="c1" handoutId={handoutId} onReveal={reveal} />
    </SidePanelScopeProvider>,
  )
}

describe('HandoutPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseActive.mockReturnValue(activeQuery(scene))
    mockUseHandout.mockReturnValue(handoutQuery(handout))
    mockUseScene.mockReturnValue(materialQuery([{ id: 'h1', kind: 'Text', visibility: 'PlayerFacing', title: 'A letter from Knott' }]))
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

  it("loads an Item's Handout through the Item owner, with the Item's full-page link (SPL-UX-51)", async () => {
    const entry: HandoutSummary = { id: 'h1', kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' }
    mockUseScene.mockReturnValue(
      materialQuery([], [{ id: 'l1', item: { id: 'k1', name: "Walter Corbitt's diary", holder: null, handouts: [entry] } }]),
    )
    mockUseActive.mockReturnValue(activeQuery({ ...scene, investigatorsPresent, reveals: [] }))
    show('h1', onReveal)

    expect(mockUseHandout).toHaveBeenCalledWith({ type: 'item', campaignId: 'c1', itemId: 'k1' }, 'h1', true)
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/items/k1/handouts/h1?from=active-scene')

    await userEvent.click(screen.getByRole('button', { name: 'Reveal The last entry' }))
    expect(onReveal).toHaveBeenCalledWith(
      {
        subjectType: 'Handout',
        subjectId: 'h1',
        title: 'The last entry',
        summary: 'Text . Player-facing',
        triggerId: 'panel-reveal-trigger-h1',
      },
      { alreadyRevealedIds: [], fallbackIds: expect.any(Array) },
    )
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

  it('shows "Reveal..." in the footer for a Player-facing Handout that has not reached everyone present (SPL-UX-21)', async () => {
    mockUseActive.mockReturnValue(activeQuery({ ...scene, investigatorsPresent, reveals: [] }))
    show('h1', onReveal)

    await userEvent.click(screen.getByRole('button', { name: 'Reveal A letter from Knott' }))

    const headingId = screen.getByRole('heading', { level: 2 }).id
    expect(onReveal).toHaveBeenCalledWith(
      {
        subjectType: 'Handout',
        subjectId: 'h1',
        title: 'A letter from Knott',
        summary: 'Text . Player-facing',
        triggerId: 'panel-reveal-trigger-h1',
      },
      { alreadyRevealedIds: [], fallbackIds: ['panel-reveal-trigger-h1', headingId] },
    )
  })

  it('shows the reveal status and keeps the trigger after a partial reveal (SPL-UX-21)', async () => {
    mockUseActive.mockReturnValue(activeQuery({ ...scene, investigatorsPresent, reveals: [handoutReveal(['i1'])] }))
    show('h1', onReveal)

    expect(screen.getByText('Revealed to Harvey Walters . not yet: Lucy Ward')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reveal A letter from Knott' }))
    expect(onReveal).toHaveBeenCalledWith(expect.anything(), { alreadyRevealedIds: ['i1'], fallbackIds: expect.any(Array) })
  })

  it('shows the status but no trigger once everyone received the Handout (SPL-UX-21)', () => {
    mockUseActive.mockReturnValue(activeQuery({ ...scene, investigatorsPresent, reveals: [handoutReveal(['i1', 'i2'])] }))
    show('h1', onReveal)

    expect(screen.getByText('Revealed to Harvey Walters and Lucy Ward')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reveal A letter from Knott' })).not.toBeInTheDocument()
  })

  it('shows no trigger for a Keeper-facing Handout (SPL-UX-21)', () => {
    mockUseActive.mockReturnValue(activeQuery({ ...scene, investigatorsPresent, reveals: [] }))
    mockUseScene.mockReturnValue(materialQuery([{ id: 'h1', kind: 'Text', visibility: 'KeeperFacing', title: 'A letter from Knott' }]))
    show('h1', onReveal)

    expect(screen.queryByRole('button', { name: 'Reveal A letter from Knott' })).not.toBeInTheDocument()
  })

  it('shows no trigger without a reveal flow (SPL-UX-21)', () => {
    mockUseActive.mockReturnValue(activeQuery({ ...scene, investigatorsPresent, reveals: [] }))
    show()

    expect(screen.queryByRole('button', { name: 'Reveal A letter from Knott' })).not.toBeInTheDocument()
  })
})
