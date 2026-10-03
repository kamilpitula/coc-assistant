import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { CampaignView } from '@/campaign-play/types/Campaign'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignSettings } from './campaign-settings'

const CAMPAIGN_ID = 'story-campaign'

const base = { id: CAMPAIGN_ID, name: 'Haunting of Corbitt House', era: '1920s', allowedCreationMethods: ['PointBuy'] } as const

function SettingsStory({ campaign }: { campaign: CampaignView }) {
  return (
    <StoryMsal>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(CAMPAIGN_ID), campaign)
          client.setQueryData(campaignQueryKeys.invite(CAMPAIGN_ID), { campaignId: CAMPAIGN_ID, token: 'abc123', status: 'Active' })
        }}
      >
        <CampaignSettings campaignId={CAMPAIGN_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'CampaignPlay/CampaignSettings',
  component: SettingsStory,
} satisfies Meta<typeof SettingsStory>

export default meta
type Story = StoryObj<typeof meta>

export const Keeper: Story = {
  args: { campaign: { ...base, allowedCreationMethods: ['PointBuy'], keeperAccountId: 'k1', playerLimit: 8, role: 'Keeper' } },
}

/** A Player who opens the address sees the not-found page (CO-UX-12). */
export const Player: Story = { args: { campaign: { ...base, allowedCreationMethods: ['PointBuy'], role: 'Player' } } }
