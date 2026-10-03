import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryProviders } from '@/shared/storybook/storyProviders'

import { InvestigatorNotFound } from './investigator-not-found'

const meta = {
  title: 'CampaignPlay/InvestigatorNotFound',
  component: InvestigatorNotFound,
  args: { campaignId: 'story-campaign' },
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof InvestigatorNotFound>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
