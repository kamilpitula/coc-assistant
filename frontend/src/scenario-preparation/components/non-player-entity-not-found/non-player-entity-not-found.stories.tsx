import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryProviders } from '@/shared/storybook/storyProviders'

import { NonPlayerEntityNotFound } from './non-player-entity-not-found'

const meta = {
  title: 'ScenarioPreparation/NonPlayerEntityNotFound',
  component: NonPlayerEntityNotFound,
  args: { campaignId: 'story-campaign' },
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof NonPlayerEntityNotFound>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
