import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, keeperRosterAllApproved, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import type { ActiveScene } from '@/scene-play/types/ActiveScene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ActiveScenePage } from './active-scene-page'

const keeperScene: ActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: 'Arkham, Boston Road',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i-a', name: 'Dr. Ames' }],
  reveals: [],
}

interface StoryArgs {
  role?: 'Keeper' | 'Player'
  scene?: ActiveScene | null
  loading?: boolean
}

function PageStory({ role = 'Keeper', scene = keeperScene, loading = false }: StoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          client.setQueryData(campaignQueryKeys.members(STORY_CAMPAIGN_ID), keeperRosterAllApproved)
          if (!loading) {
            client.setQueryData(activeSceneQueryKeys.detail(STORY_CAMPAIGN_ID), scene)
          }
        }}
      >
        <ActiveScenePage campaignId={STORY_CAMPAIGN_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/ActiveScenePage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Keeper: Story = {}

export const PlayerPresent: Story = {
  args: {
    role: 'Player',
    scene: { kind: 'present-player', title: 'The Corbitt House', location: 'Arkham, Boston Road', investigatorsPresent: [{ name: 'Dr. Ames', isYours: true }] },
  },
}

export const PlayerNotPresent: Story = { args: { role: 'Player', scene: { kind: 'absent-player', title: 'The Corbitt House' } } }

export const NothingActiveForKeeper: Story = { args: { scene: null } }

export const NothingActiveForPlayer: Story = { args: { role: 'Player', scene: null } }

export const Loading: Story = { args: { loading: true } }
