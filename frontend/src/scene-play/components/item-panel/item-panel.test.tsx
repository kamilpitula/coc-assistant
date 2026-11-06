import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import type { Item } from '@/scenario-preparation/types/Item'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { routerState } from '@/shared/test-support/routerMock'

import { ItemPanel } from './item-panel'

// specs/scene-play/ux.md section 22.5: the Active Scene hosts the Item's panel body with from="active-scene" and a
// "Reveal..." action while the Item is listed in To reveal; a Player or a missing Scene shows not-found.
const { mockUseActiveScene, mockUseScene, mockUseItem, mockUseCampaignMembers } = vi.hoisted(() => ({
  mockUseActiveScene: vi.fn(),
  mockUseScene: vi.fn(),
  mockUseItem: vi.fn(),
  mockUseCampaignMembers: vi.fn(),
}))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/scene-play/hooks/useActiveScene', () => ({ useActiveScene: mockUseActiveScene }))
vi.mock('@/scenario-preparation/hooks/useScenes', () => ({ useScene: mockUseScene }))
vi.mock('@/scenario-preparation/hooks/useItems', () => ({ useItem: mockUseItem }))
vi.mock('@/campaign-play/hooks/useCampaignMembers', () => ({ useCampaignMembers: mockUseCampaignMembers }))

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const paragraph = (value: string) => ({ type: 'paragraph', version: 1, children: [text(value)] })

const item: Item = {
  id: 'k1',
  name: "Walter Corbitt's diary",
  playerFacingDescription: { root: { type: 'root', children: [paragraph("Walter Corbitt's diary.")] } },
  keeperNotes: null,
  holder: null,
  handouts: [],
  scenes: [],
}

const members: CampaignMember[] = [
  {
    memberId: 'm1',
    displayName: 'Harvey Walters',
    role: 'Player',
    isYou: false,
    investigator: { visibility: 'Visible', id: 'i1', name: 'Harvey Walters', status: 'Approved' },
  },
]

const scene = (reveals: KeeperActiveScene['reveals'] = []): KeeperActiveScene => ({
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
  reveals,
})

const material = {
  id: 's1',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: null,
  finishedAt: null,
  location: '',
  keeperNotes: null,
  itemLinks: [{ id: 'l1', item: { id: 'k1', name: "Walter Corbitt's diary", holder: null, handouts: [] } }],
  nonPlayerEntityLinks: [],
  handouts: [],
}

function show(onReveal = vi.fn()) {
  render(
    <SidePanelScopeProvider>
      <ItemPanel campaignId="c1" itemId="k1" onReveal={onReveal} />
    </SidePanelScopeProvider>,
  )
  return onReveal
}

describe('ItemPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerState.location.state = {}
    mockUseActiveScene.mockReturnValue({ data: scene() })
    mockUseScene.mockReturnValue({ data: material })
    mockUseItem.mockReturnValue({ data: item, isError: false, refetch: vi.fn() })
    mockUseCampaignMembers.mockReturnValue({ data: members, isError: false, refetch: vi.fn() })
  })

  it('shows the Item body with an origin back to the Active Scene and a Reveal trigger while it is listed in To reveal', async () => {
    const user = userEvent.setup()
    const onReveal = show()

    expect(screen.getByRole('heading', { level: 2, name: "Walter Corbitt's diary" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/campaigns/c1/items/k1?from=active-scene')

    await user.click(screen.getByRole('button', { name: "Reveal Walter Corbitt's diary" }))
    expect(onReveal).toHaveBeenCalledWith(
      { subjectType: 'Item', subjectId: 'k1', title: "Walter Corbitt's diary", summary: 'Item', triggerId: 'panel-reveal-trigger-k1' },
      expect.objectContaining({ alreadyRevealedIds: [] }),
    )
  })

  it('shows no Reveal trigger once the Item reached every Investigator present', () => {
    mockUseActiveScene.mockReturnValue({
      data: scene([{ revealId: 'r1', revealedAt: '2026-10-28T19:52:00Z', subjectType: 'Item', title: "Walter Corbitt's diary", handoutKind: null, content: null, file: null, imageDescription: null, subjectId: 'k1', recipients: [{ id: 'i1', name: 'Harvey Walters' }, { id: 'i2', name: 'Lucy Ward' }] }]),
    })
    show()

    expect(screen.getByRole('heading', { level: 2, name: "Walter Corbitt's diary" })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "Reveal Walter Corbitt's diary" })).not.toBeInTheDocument()
  })

  it('shows not-found for a Player, a missing Scene, or an Item the Scene does not link', () => {
    mockUseActiveScene.mockReturnValue({ data: { kind: 'player' } })
    const { unmount } = render(
      <SidePanelScopeProvider>
        <ItemPanel campaignId="c1" itemId="k1" />
      </SidePanelScopeProvider>,
    )
    expect(screen.getByText("We couldn't find that.")).toBeInTheDocument()
    unmount()

    mockUseActiveScene.mockReturnValue({ data: scene() })
    mockUseScene.mockReturnValue({ data: { ...material, itemLinks: [] } })
    show()
    expect(screen.queryByRole('button', { name: "Reveal Walter Corbitt's diary" })).not.toBeInTheDocument()
  })
})
