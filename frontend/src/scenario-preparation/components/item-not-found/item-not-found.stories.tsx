import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ItemNotFound } from './item-not-found'

const meta = {
  title: 'ScenarioPreparation/ItemNotFound',
  component: ItemNotFound,
  args: { campaignId: 'story-campaign' },
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof ItemNotFound>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
