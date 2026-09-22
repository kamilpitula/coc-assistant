import type { Meta, StoryObj } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { CreateCampaignForm } from './create-campaign-form'

const queryClient = new QueryClient()

const meta = {
  title: 'CampaignPlay/CreateCampaignForm',
  component: CreateCampaignForm,
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof CreateCampaignForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
