import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, keeperRosterAllApproved, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import { paragraph } from '@/scene-play/test-support/revealFixtures'
import type { ActiveScene, KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { sidePanelSearchSchema } from '@/shared/components/side-panel/sidePanelParams'
import { StoryMsal } from '@/shared/storybook/storyMsal'

import { ActiveScenePage } from './active-scene-page'
import { ReferenceTab, RevealedTab, RunTab, ToRevealTab } from './active-scene-tabs'

const reveal: KeeperReveal = {
  revealId: 'r1',
  revealedAt: '2026-10-28T19:52:00Z',
  subjectType: 'Handout',
  title: 'The front door',
  handoutKind: 'ReadAloud',
  content: null,
  file: null,
  imageDescription: null,
  subjectId: 'h1',
  recipients: [{ id: 'i-a', name: 'Dr. Ames' }],
}

const keeperScene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: 'Arkham, Boston Road',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [
    { id: 'i-a', name: 'Dr. Ames' },
    { id: 'i-b', name: 'Missy Chang' },
  ],
  reveals: [reveal],
}

const material: Scene = {
  id: 'story-scene',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: '2026-10-28T19:40:00Z',
  finishedAt: null,
  location: 'Arkham, Boston Road',
  keeperNotes: paragraph('Walter is in the cellar.'),
  nonPlayerEntityLinks: [
    {
      id: 'l1',
      nonPlayerEntity: { id: 'n1', type: 'HumanNpc', name: 'Mr. Knott' },
      playerFacingName: 'The landlord',
      playerFacingDescription: null,
    },
  ],
  itemLinks: [],
  handouts: [
    { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' },
    { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: "Corbitt's true nature" },
  ],
}

type StoryTab = 'run' | 'to-reveal' | 'reference' | 'revealed'

const tabIds: Record<StoryTab, string> = {
  run: '/campaigns/$campaignId/active-scene/',
  'to-reveal': '/campaigns/$campaignId/active-scene/to-reveal',
  reference: '/campaigns/$campaignId/active-scene/reference',
  revealed: '/campaigns/$campaignId/active-scene/revealed',
}

const tabComponents = { run: RunTab, 'to-reveal': ToRevealTab, reference: ReferenceTab, revealed: RevealedTab }

interface StoryArgs {
  role?: 'Keeper' | 'Player'
  scene?: ActiveScene | null
  loading?: boolean
  tab?: StoryTab
}

function storyCampaignOf(role: 'Keeper' | 'Player') {
  return role === 'Keeper' ? keeperCampaign : playerCampaign
}

function seedPageStory(client: QueryClient, role: 'Keeper' | 'Player', scene: ActiveScene | null, loading: boolean): void {
  client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), storyCampaignOf(role))
  client.setQueryData(campaignQueryKeys.members(STORY_CAMPAIGN_ID), keeperRosterAllApproved)
  if (loading) {
    return
  }
  client.setQueryData(activeSceneQueryKeys.detail(STORY_CAMPAIGN_ID), scene)
  if (scene?.kind === 'keeper') {
    client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, scene.scenarioId, scene.sceneId), material)
  }
}

/** The leaf route's relative path and the matching entry URL for a sub-tab. */
function storyLeafLocation(tab: StoryTab): { path: string; entry: string } {
  return tab === 'run' ? { path: '/', entry: '/active-scene/' } : { path: tab, entry: `/active-scene/${tab}` }
}

function PageStory({ role = 'Keeper', scene = keeperScene, loading = false, tab = 'run' }: StoryArgs) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  seedPageStory(queryClient, role, scene, loading)

  const Tab = tabComponents[tab]
  const location = storyLeafLocation(tab)
  const rootRoute = createRootRoute()
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '/campaigns/$campaignId/active-scene',
    path: 'active-scene',
    component: () => <ActiveScenePage campaignId={STORY_CAMPAIGN_ID} />,
  })
  const leafRoute = createRoute({
    getParentRoute: () => layoutRoute,
    id: tabIds[tab],
    path: location.path,
    validateSearch: sidePanelSearchSchema,
    component: Tab,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([layoutRoute.addChildren([leafRoute])]),
    history: createMemoryHistory({ initialEntries: [location.entry] }),
  })

  return (
    <StoryMsal tokens="pending">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/ActiveScenePage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const KeeperRun: Story = {}

export const KeeperToReveal: Story = { args: { tab: 'to-reveal' } }

export const KeeperReference: Story = { args: { tab: 'reference' } }

export const KeeperRevealed: Story = { args: { tab: 'revealed' } }

export const PlayerPresent: Story = {
  args: {
    role: 'Player',
    scene: { kind: 'present-player', reveals: [], title: 'The Corbitt House', location: 'Arkham, Boston Road', investigatorsPresent: [{ name: 'Dr. Ames', isYours: true }] },
  },
}

export const PlayerNotPresent: Story = { args: { role: 'Player', scene: { kind: 'absent-player', title: 'The Corbitt House' } } }

export const NothingActiveForKeeper: Story = { args: { scene: null } }

export const NothingActiveForPlayer: Story = { args: { role: 'Player', scene: null } }

export const Loading: Story = { args: { loading: true } }
