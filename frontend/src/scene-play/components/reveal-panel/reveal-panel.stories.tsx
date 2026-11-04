import type { Meta, StoryObj } from '@storybook/react-vite'

import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import type { ActiveScene, KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { keeperReveal, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { RevealPanel } from './reveal-panel'

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [],
  reveals: [keeperReveal(readAloudReveal, 'story-handout', ['Harvey Walters']), keeperReveal(textReveal, 'story-text', ['Lucy Ward'])],
}

interface PanelStoryArgs {
  role?: 'Keeper' | 'Player'
  revealId?: string
  loading?: boolean
}

function PanelStory({ role = 'Keeper', revealId = 'story-read-aloud', loading = false }: PanelStoryArgs) {
  const active: ActiveScene =
    role === 'Keeper'
      ? scene
      : { kind: 'present-player', title: 'The Corbitt House', location: '', investigatorsPresent: [], reveals: [] }

  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          if (!loading) {
            client.setQueryData(activeSceneQueryKeys.detail(STORY_CAMPAIGN_ID), active)
          }
        }}
      >
        <SidePanelScopeProvider>
          <RevealPanel campaignId={STORY_CAMPAIGN_ID} revealId={revealId} />
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/RevealPanel',
  component: PanelStory,
} satisfies Meta<typeof PanelStory>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const UnknownReveal: Story = { args: { revealId: 'unknown' } }

export const Player: Story = { args: { role: 'Player' } }

export const Loading: Story = { args: { loading: true } }
