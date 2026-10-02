import type { Meta, StoryObj } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { Campaign } from '@/campaign-play/types/Campaign'

import { RulesOptions } from './rules-options'

const campaign: Campaign = {
  id: 'story-campaign',
  name: 'The Haunting',
  keeperAccountId: 'story-keeper',
  playerLimit: 8,
  era: '1920s',
  allowedCreationMethods: ['StandardRolling', 'PointBuy', 'QuickFire'],
  role: 'Keeper',
}

// Seeds the Keeper's Campaign so the story renders without calling the API.
function withCampaign(data: Campaign) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  queryClient.setQueryData(campaignQueryKeys.detail(data.id), data)
  return queryClient
}

const meta = {
  title: 'CampaignPlay/RulesOptions',
  component: RulesOptions,
} satisfies Meta<typeof RulesOptions>

export default meta
type Story = StoryObj<typeof meta>

export const AllMethodsAllowed: Story = {
  args: { campaignId: campaign.id },
  decorators: [
    (Story) => (
      <QueryClientProvider client={withCampaign(campaign)}>
        <Story />
      </QueryClientProvider>
    ),
  ],
}

export const PointBuyOnly: Story = {
  args: { campaignId: campaign.id },
  decorators: [
    (Story) => (
      <QueryClientProvider
        client={withCampaign({ ...campaign, allowedCreationMethods: ['PointBuy'] })}
      >
        <Story />
      </QueryClientProvider>
    ),
  ],
}
