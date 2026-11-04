import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef } from 'react'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { handoutQueryKeys } from '@/scenario-preparation/services/handoutApi'
import { nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import { thugHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import type { Handout } from '@/scenario-preparation/types/Handout'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import { cluesQueryKeys } from '@/scene-play/services/cluesApi'
import { clueOf, keeperReveal, paragraph, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { Clues } from '@/scene-play/types/Reveal'
import { sidePanelSearchSchema } from '@/shared/components/side-panel/sidePanelParams'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'

import { ActiveScenePanel } from './active-scene-panel'

const owner = { type: 'scene', campaignId: STORY_CAMPAIGN_ID, scenarioId: 'story-scenario', sceneId: 'story-scene' } as const
const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [],
  reveals: [keeperReveal(readAloudReveal, 'story-handout', ['Harvey Walters'])],
}
const clues: Clues = { investigatorName: 'Lucy Ward', clues: [clueOf(textReveal, { id: 's2', title: 'The Corbitt House' })] }
const handout: Handout = {
  id: 'story-handout',
  kind: 'ReadAloud',
  visibility: 'PlayerFacing',
  title: 'The front door',
  content: paragraph('The door creaks open onto a cold hall.'),
}
const material: Scene = {
  id: 'story-scene',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: '2026-10-12T19:40:00Z',
  finishedAt: null,
  location: '',
  keeperNotes: null,
  nonPlayerEntityLinks: [
    {
      id: 'story-link',
      nonPlayerEntity: { id: 'story-human-npc', type: 'HumanNpc', name: 'Thug' },
      playerFacingName: 'The man by the gate',
      playerFacingDescription: null,
    },
  ],
  itemLinks: [],
  handouts: [],
}

function HostStory({ search }: { search?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  queryClient.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)
  queryClient.setQueryData(activeSceneQueryKeys.detail(STORY_CAMPAIGN_ID), scene)
  queryClient.setQueryData(cluesQueryKeys.investigator(STORY_CAMPAIGN_ID, 'story-investigator'), clues)
  queryClient.setQueryData(handoutQueryKeys.detail(owner, 'story-handout'), handout)
  queryClient.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, 'story-scenario', 'story-scene'), material)
  queryClient.setQueryData(nonPlayerEntityQueryKeys.humanNpc(STORY_CAMPAIGN_ID, 'story-human-npc'), thugHumanNpc)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const rootRoute = createRootRoute({
    component: () => (
      <SidePanelScopeProvider>
        <h1 ref={headingRef} tabIndex={-1}>
          The Corbitt House
        </h1>
        <Outlet />
      </SidePanelScopeProvider>
    ),
  })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    validateSearch: sidePanelSearchSchema,
    component: () => <ActiveScenePanel campaignId={STORY_CAMPAIGN_ID} headingRef={headingRef} />,
  })
  const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]), history: createMemoryHistory({ initialEntries: [search ?? '/'] }) })

  return (
    <StoryMsal tokens="pending">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/ActiveScenePanel',
  component: HostStory,
} satisfies Meta<typeof HostStory>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const CluesOpen: Story = { args: { search: '/?panel=clues&investigator=story-investigator' } }

export const HandoutOpen: Story = { args: { search: '/?panel=handout&handout=story-handout' } }

export const EntityOpen: Story = { args: { search: '/?panel=entity&link=story-link' } }

export const RevealOpen: Story = { args: { search: '/?panel=reveal&reveal=story-read-aloud' } }
