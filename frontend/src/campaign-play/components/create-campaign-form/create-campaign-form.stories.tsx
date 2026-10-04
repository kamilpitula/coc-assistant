import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CreateCampaignForm } from './create-campaign-form'

const meta = {
  title: 'CampaignPlay/CreateCampaignForm',
  component: CreateCampaignForm,
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof CreateCampaignForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
