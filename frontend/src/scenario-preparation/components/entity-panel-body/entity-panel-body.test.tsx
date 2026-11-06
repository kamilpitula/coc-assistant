import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'
import { thugHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import type { NonPlayerEntityLink, Scene } from '@/scenario-preparation/types/Scene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { routerState } from '@/shared/test-support/routerMock'

import { EntityPanelBody } from './entity-panel-body'

// specs/navigation/ux.md section 3 (PBI-SPL-005 design record D1): the scene-scoped entity body reads the link from the
// given Scene through the same query as the full pages, shows what Players see and the read-only profile shifted down,
// and carries `from` to the profile page only when the host passes one.
const { mockUseScene, mockUseHumanNpc, mockUseMythosCreature, refetch } = vi.hoisted(() => ({
  mockUseScene: vi.fn(),
  mockUseHumanNpc: vi.fn(),
  mockUseMythosCreature: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
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
const materialQuery = (data: Scene | null | undefined, overrides: Record<string, unknown> = {}) => ({ data, isError: false, refetch, ...overrides })
const profileQuery = (data: unknown, overrides: Record<string, unknown> = {}) => ({ data, isError: false, refetch, ...overrides })

function show(linkId = 'l1', from?: 'active-scene') {
  return render(
    <SidePanelScopeProvider>
      <EntityPanelBody campaignId="c1" scenarioId="p1" sceneId="s1" linkId={linkId} from={from} />
    </SidePanelScopeProvider>,
  )
}

describe('EntityPanelBody', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
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
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/human-npcs/n1')
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
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/mythos-creatures/m1')
  })

  it('shows a status line and an action in the footer when the host passes them (SPL-UX-21)', () => {
    render(
      <SidePanelScopeProvider>
        <EntityPanelBody
          campaignId="c1"
          scenarioId="p1"
          sceneId="s1"
          linkId="l1"
          statusLine="Revealed to Harvey Walters . not yet: Lucy Ward"
          action={<button type="button">Reveal...</button>}
        />
      </SidePanelScopeProvider>,
    )

    expect(screen.getByText('Revealed to Harvey Walters . not yet: Lucy Ward')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reveal...' })).toBeInTheDocument()
  })

  it("reads the link from the given Scene and the profile by its type", () => {
    show()

    expect(mockUseScene).toHaveBeenCalledWith('c1', 'p1', 's1', true)
    expect(mockUseHumanNpc).toHaveBeenCalledWith('c1', 'n1', true)
    expect(mockUseMythosCreature).not.toHaveBeenCalled()

    show('l2')

    expect(mockUseMythosCreature).toHaveBeenCalledWith('c1', 'm1', true)
  })

  it('carries `from` to the profile link only when the host passes one', () => {
    show('l1', 'active-scene')

    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/human-npcs/n1?from=active-scene')
  })

  it('says there is no Player-facing description yet when the link has none', () => {
    mockUseScene.mockReturnValue(materialQuery(material([{ ...npcLink, playerFacingDescription: null }])))
    show()

    expect(screen.getByText('No Player-facing description yet.')).toBeInTheDocument()
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
        <EntityPanelBody campaignId="c1" scenarioId="p1" sceneId="s1" linkId="l1" />
      </SidePanelScopeProvider>,
    )
    expect(screen.getByText("We couldn't load this.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })
})
