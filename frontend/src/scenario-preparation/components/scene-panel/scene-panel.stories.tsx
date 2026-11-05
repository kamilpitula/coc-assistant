import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef } from 'react'

import { handoutQueryKeys } from '@/scenario-preparation/services/handoutApi'
import { nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import { thugHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import type { Handout } from '@/scenario-preparation/types/Handout'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { sidePanelSearchSchema } from '@/shared/components/side-panel/sidePanelParams'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'

import { ScenePanel } from './scene-panel'

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const handout: Handout = {
  id: 'story-handout',
  kind: 'ReadAloud',
  visibility: 'PlayerFacing',
  title: 'The front door',
  content: {
    root: {
      type: 'root',
      children: [
        { type: 'heading', version: 1, tag: 'h3', children: [text('Inside')] },
        { type: 'paragraph', version: 1, children: [text('The door creaks open onto a cold hall.')] },
      ],
    },
  },
}
const material: Scene = {
  id: 'story-scene',
  title: 'The Corbitt House',
  status: 'Prepared',
  startedAt: null,
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
  queryClient.setQueryData(handoutQueryKeys.detail({ type: 'scene', campaignId: 'story-campaign', scenarioId: 'story-scenario', sceneId: 'story-scene' }, 'story-handout'), handout)
  queryClient.setQueryData(sceneQueryKeys.detail('story-campaign', 'story-scenario', 'story-scene'), material)
  queryClient.setQueryData(nonPlayerEntityQueryKeys.humanNpc('story-campaign', 'story-human-npc'), thugHumanNpc)

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
    component: () => <ScenePanel campaignId="story-campaign" scenarioId="story-scenario" sceneId="story-scene" headingRef={headingRef} />,
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
  title: 'ScenarioPreparation/ScenePanel',
  component: HostStory,
} satisfies Meta<typeof HostStory>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const HandoutOpen: Story = { args: { search: '/?panel=handout&handout=story-handout' } }

export const EntityOpen: Story = { args: { search: '/?panel=entity&link=story-link' } }
