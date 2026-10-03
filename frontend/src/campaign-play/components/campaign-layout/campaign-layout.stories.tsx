import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import type { CampaignView } from '@/campaign-play/types/Campaign'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignLayout } from './campaign-layout'

interface StoryArgs {
  /** The seeded Campaign; undefined leaves it loading (or failing, with failing tokens). */
  campaign?: CampaignView | null
  tokens: 'pending' | 'failing'
}

function LayoutStory({ campaign, tokens }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => campaign !== undefined && client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), campaign)}
      >
        <CampaignLayout campaignId={STORY_CAMPAIGN_ID} section="overview" isOverview>
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

export const Loading: Story = { args: { tokens: 'pending' } }

export const LoadError: Story = { args: { tokens: 'failing' } }

export const NotFound: Story = { args: { campaign: null, tokens: 'pending' } }
