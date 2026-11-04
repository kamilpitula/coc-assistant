import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import type { CampaignView } from '@/campaign-play/types/Campaign'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import type { ActiveScene } from '@/scene-play/types/ActiveScene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignLayout } from './campaign-layout'

const storyScene: ActiveScene = {
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

interface StoryArgs {
  /** The seeded Campaign; undefined leaves it loading (or failing, with failing tokens). */
  campaign?: CampaignView | null
  /** The seeded Active Scene; undefined leaves none Active. */
  activeScene?: ActiveScene | null
  section?: 'overview' | 'active-scene' | 'wall' | 'settings'
  isOverview?: boolean
  tokens: 'pending' | 'failing'
}

function LayoutStory({ campaign, activeScene = null, section = 'overview', isOverview = true, tokens }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          if (campaign !== undefined) {
            client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), campaign)
          }
          client.setQueryData(activeSceneQueryKeys.detail(STORY_CAMPAIGN_ID), activeScene)
        }}
      >
        <CampaignLayout campaignId={STORY_CAMPAIGN_ID} section={section} isOverview={isOverview}>
          <p className="text-sm">The page content goes here.</p>
        </CampaignLayout>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'CampaignPlay/CampaignLayout',
  component: LayoutStory,
} satisfies Meta<typeof LayoutStory>

export default meta
type Story = StoryObj<typeof meta>

export const Loaded: Story = { args: { campaign: keeperCampaign, tokens: 'pending' } }

/** While a Scene is Active the Active Scene tab shows "Live" without another request (specs/navigation/ux.md section 2). */
export const LoadedWithLiveScene: Story = {
  args: { campaign: keeperCampaign, activeScene: storyScene, section: 'active-scene', isOverview: false, tokens: 'pending' },
}

export const Loading: Story = { args: { tokens: 'pending' } }

export const LoadError: Story = { args: { tokens: 'failing' } }

export const NotFound: Story = { args: { campaign: null, tokens: 'pending' } }
