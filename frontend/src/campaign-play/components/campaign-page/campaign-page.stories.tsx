import type { Meta, StoryObj } from '@storybook/react-vite'

import { CampaignLiveConnectionContext } from '@/campaign-play/providers/campaignLiveConnectionContext'
import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { CampaignView } from '@/campaign-play/types/Campaign'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignPage } from './campaign-page'

const campaignId = 'story-campaign'

const live = {
  connection: 'connected',
  presence: { connection: 'connected', presenceByMember: { keeper: 'Connected', player: 'Connected' } },
  retry: () => {},
} as const

function withCampaign(campaign: CampaignView | null) {
  return (Story: () => React.JSX.Element) => (
    <StoryProviders
      seed={(client) => {
        client.setQueryData(campaignQueryKeys.detail(campaignId), campaign)
        client.setQueryData(campaignQueryKeys.myInvestigator(campaignId), null)
        client.setQueryData(campaignQueryKeys.members(campaignId), [
          { memberId: 'keeper', displayName: 'Eleanor Hart', role: 'Keeper', isYou: false },
          { memberId: 'player', displayName: 'Sam Okafor', role: 'Player', isYou: true },
        ])
      }}
    >
      <CampaignLiveConnectionContext.Provider value={live}>
        <Story />
      </CampaignLiveConnectionContext.Provider>
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
