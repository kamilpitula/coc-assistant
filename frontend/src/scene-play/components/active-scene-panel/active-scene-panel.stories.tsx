import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef } from 'react'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import { cluesQueryKeys } from '@/scene-play/services/cluesApi'
import { clueOf, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import type { Clues } from '@/scene-play/types/Reveal'
import { sidePanelSearchSchema } from '@/shared/components/side-panel/sidePanelParams'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'

import { ActiveScenePanel } from './active-scene-panel'

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [],
  reveals: [],
}
const clues: Clues = { investigatorName: 'Lucy Ward', clues: [clueOf(textReveal, { id: 's2', title: 'The Corbitt House' })] }

function HostStory({ search }: { search?: string }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  queryClient.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)
  queryClient.setQueryData(activeSceneQueryKeys.detail(STORY_CAMPAIGN_ID), scene)
  queryClient.setQueryData(cluesQueryKeys.investigator(STORY_CAMPAIGN_ID, 'story-investigator'), clues)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const rootRoute = createRootRoute({
    component: () => (
      <SidePanelScopeProvider>
        <h1 ref={headingRef} tabIndex={-1}>
          The Corbitt House
        </h1>
        <Outlet />
      </SidePanelScopeProvider>,
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
