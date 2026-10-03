import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { CampaignView } from '@/campaign-play/types/Campaign'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignPage } from './campaign-page'

const campaignId = 'story-campaign'

function withCampaign(campaign: CampaignView | null) {
  return (Story: () => React.JSX.Element) => (
    <StoryProviders
      seed={(client) => {
        client.setQueryData(campaignQueryKeys.detail(campaignId), campaign)
        client.setQueryData(campaignQueryKeys.myInvestigator(campaignId), null)
      }}
    >
      <Story />
    </StoryProviders>
  )
}

const meta = {
  title: 'CampaignPlay/CampaignPage',
  component: CampaignPage,
  args: { campaignId },
} satisfies Meta<typeof CampaignPage>

export default meta
type Story = StoryObj<typeof meta>

export const PlayerView: Story = {
  decorators: [
    withCampaign({ id: campaignId, name: 'The Haunting', era: '1920s', allowedCreationMethods: ['PointBuy'], role: 'Player' }),
  ],
}

export const NotFound: Story = { decorators: [withCampaign(null)] }
