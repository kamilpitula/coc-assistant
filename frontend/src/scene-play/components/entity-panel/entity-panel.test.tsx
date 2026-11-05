import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActiveScene, KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'
import { thugHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import type { NonPlayerEntityLink, Scene } from '@/scenario-preparation/types/Scene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { routerState } from '@/shared/test-support/routerMock'

import { EntityPanel } from './entity-panel'

// specs/navigation/ux.md section 3 (refinements G2, G5, G6, G8): the entity panel reads the link from the Keeper's Active
// Scene, shows what Players see and the read-only profile shifted down, and links to the profile with ?from=active-scene.
const { mockUseActive, mockUseScene, mockUseHumanNpc, mockUseMythosCreature, onReveal, refetch } = vi.hoisted(() => ({
  mockUseActive: vi.fn(),
  mockUseScene: vi.fn(),
  mockUseHumanNpc: vi.fn(),
  mockUseMythosCreature: vi.fn(),
  onReveal: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useActiveScene: mockUseActive }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/scenario-preparation/hooks/useNonPlayerEntities', () => ({ useHumanNpc: mockUseHumanNpc, useMythosCreature: mockUseMythosCreature }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const description = {
  root: {
    type: 'root' as const,
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('Inside')] },
      { type: 'paragraph', version: 1, children: [text('A broad man in a grey suit watches the house.')] },
    ],
  },
}
const npcLink: NonPlayerEntityLink = {
  id: 'l1',
  nonPlayerEntity: { id: 'n1', type: 'HumanNpc', name: 'Thug' },
  playerFacingName: 'The man by the gate',
  playerFacingDescription: description,
}
const creatureLink: NonPlayerEntityLink = {
  id: 'l2',
  nonPlayerEntity: { id: 'm1', type: 'MythosCreature', name: 'Ghoul' },
  playerFacingName: 'A shape in the cellar',
  playerFacingDescription: null,
}
const material = (links: NonPlayerEntityLink[]): Scene => ({
  id: 's1',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: '2026-10-12T19:40:00Z',
  finishedAt: null,
  location: '',
  keeperNotes: null,
  nonPlayerEntityLinks: links,
  itemLinks: [],
  handouts: [],
})
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
const materialQuery = (data: Scene | null | undefined, overrides: Record<string, unknown> = {}) => ({ data, isError: false, refetch, ...overrides })
const profileQuery = (data: unknown, overrides: Record<string, unknown> = {}) => ({ data, isError: false, refetch, ...overrides })

const investigatorsPresent = [
  { id: 'i1', name: 'Harvey Walters' },
  { id: 'i2', name: 'Lucy Ward' },
]

function linkReveal(recipientIds: string[]): KeeperReveal {
  return {
    revealId: `r-l1-${recipientIds.join('-')}`,
    revealedAt: '2026-10-28T19:52:00Z',
    subjectType: 'NonPlayerEntity',
    title: 'The man by the gate',
    handoutKind: null,
    content: null,
    file: null,
    imageDescription: null,
    subjectId: 'l1',
    recipients: investigatorsPresent.filter((investigator) => recipientIds.includes(investigator.id)),
  }
}

function show(linkId = 'l1', reveal?: typeof onReveal) {
  return render(
    <SidePanelScopeProvider>
      <EntityPanel campaignId="c1" linkId={linkId} onReveal={reveal} />
    </SidePanelScopeProvider>,
  )
}

describe('EntityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseActive.mockReturnValue(activeQuery(scene))
    mockUseScene.mockReturnValue(materialQuery(material([npcLink, creatureLink])))
    mockUseHumanNpc.mockReturnValue(profileQuery(thugHumanNpc))
    mockUseMythosCreature.mockReturnValue(profileQuery(ghoulMythosCreature))
  })

  it('shows a Human NPC link with what Players see and the read-only profile shifted down, and links to the profile (NAV-UX-4, NAV-UX-7)', () => {
    show()

    expect(screen.getByText('Non-Player Entity')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'The man by the gate' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'What Players see' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Inside' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Thug' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 5, name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 6, name: 'Worked-out values' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/human-npcs/n1?from=active-scene')
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Duplicate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows a Mythos Creature link with the profile shifted down, and links to the profile', () => {
    show('l2')

    expect(screen.getByRole('heading', { level: 2, name: 'A shape in the cellar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Ghoul' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 5, name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 6, name: 'Immunities' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/mythos-creatures/m1?from=active-scene')
  })

  it('says there is no Player-facing description yet when the link has none', () => {
    mockUseScene.mockReturnValue(materialQuery(material([{ ...npcLink, playerFacingDescription: null }])))
    show()

    expect(screen.getByText('No Player-facing description yet.')).toBeInTheDocument()
  })

  it("reads the link from the Keeper's Active Scene and the profile by its type", () => {
    show()

    expect(mockUseScene).toHaveBeenCalledWith('c1', 'p1', 's1', true)
    expect(mockUseHumanNpc).toHaveBeenCalledWith('c1', 'n1', true)
    expect(mockUseMythosCreature).not.toHaveBeenCalled()

    show('l2')

    expect(mockUseMythosCreature).toHaveBeenCalledWith('c1', 'm1', true)
  })

  it('says the subject was not found for an unknown link, with no footer and no profile request (NAV-UX-9)', () => {
    show('unknown')

    expect(screen.getByRole('heading', { level: 2, name: 'Non-Player Entity' })).toBeInTheDocument()
    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
    expect(mockUseHumanNpc).not.toHaveBeenCalled()
    expect(mockUseMythosCreature).not.toHaveBeenCalled()
  })

  it('says the subject was not found when the Scene is gone, with no profile request (NAV-UX-9)', () => {
    mockUseScene.mockReturnValue(materialQuery(null))
    show()

    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
    expect(mockUseHumanNpc).not.toHaveBeenCalled()
    expect(mockUseMythosCreature).not.toHaveBeenCalled()
  })

  it('says the subject was not found for a missing profile, with no footer (NAV-UX-9)', () => {
    mockUseHumanNpc.mockReturnValue(profileQuery(null))
    show()

    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open full page' })).not.toBeInTheDocument()
  })

  it('shows the kind label, a Skeleton while loading, and retries on a failure', async () => {
    mockUseScene.mockReturnValue(materialQuery(undefined))
    const { rerender } = show()
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()

    mockUseScene.mockReturnValue(materialQuery(undefined, { isError: true }))
    rerender(
      <SidePanelScopeProvider>
        <EntityPanel campaignId="c1" linkId="l1" />
      </SidePanelScopeProvider>,
    )
    expect(screen.getByText("We couldn't load this.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('says the subject was not found for a Player, sending no Scene or profile request (NAV-UX-9)', () => {
    mockUseActive.mockReturnValue(activeQuery({ kind: 'present-player', title: 'The Corbitt House', location: '', investigatorsPresent: [], reveals: [] }))
    show()

    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(mockUseScene).not.toHaveBeenCalled()
    expect(mockUseHumanNpc).not.toHaveBeenCalled()
    expect(mockUseMythosCreature).not.toHaveBeenCalled()
  })

  it('says the subject was not found when no Scene is Active, sending no Scene or profile request (NAV-UX-9)', () => {
    mockUseActive.mockReturnValue(activeQuery(null))
    show()

    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    expect(mockUseScene).not.toHaveBeenCalled()
  })

  it('shows "Reveal..." in the footer for a link that has not reached everyone present (SPL-UX-21)', async () => {
    mockUseActive.mockReturnValue(activeQuery({ ...scene, investigatorsPresent, reveals: [] }))
    show('l1', onReveal)

    await userEvent.click(screen.getByRole('button', { name: 'Reveal The man by the gate' }))

    const headingId = screen.getByRole('heading', { level: 2 }).id
    expect(onReveal).toHaveBeenCalledWith(
      {
        subjectType: 'NonPlayerEntity',
        subjectId: 'l1',
        title: 'The man by the gate',
        summary: 'Non-Player Entity',
        triggerId: 'panel-reveal-trigger-l1',
      },
      { alreadyRevealedIds: [], fallbackIds: ['panel-reveal-trigger-l1', headingId] },
    )
  })

  it('shows the reveal status and keeps the trigger after a partial reveal (SPL-UX-21)', async () => {
    mockUseActive.mockReturnValue(activeQuery({ ...scene, investigatorsPresent, reveals: [linkReveal(['i1'])] }))
    show('l1', onReveal)

    expect(screen.getByText('Revealed to Harvey Walters . not yet: Lucy Ward')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reveal The man by the gate' }))
    expect(onReveal).toHaveBeenCalledWith(expect.anything(), { alreadyRevealedIds: ['i1'], fallbackIds: expect.any(Array) })
  })

  it('shows the status but no trigger once everyone received the link (SPL-UX-21)', () => {
    mockUseActive.mockReturnValue(activeQuery({ ...scene, investigatorsPresent, reveals: [linkReveal(['i1', 'i2'])] }))
    show('l1', onReveal)

    expect(screen.getByText('Revealed to Harvey Walters and Lucy Ward')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reveal The man by the gate' })).not.toBeInTheDocument()
  })

  it('shows no trigger without a reveal flow (SPL-UX-21)', () => {
    mockUseActive.mockReturnValue(activeQuery({ ...scene, investigatorsPresent, reveals: [] }))
    show()

    expect(screen.queryByRole('button', { name: 'Reveal The man by the gate' })).not.toBeInTheDocument()
  })
})
