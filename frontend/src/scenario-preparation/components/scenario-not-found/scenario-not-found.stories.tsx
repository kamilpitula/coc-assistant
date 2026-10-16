import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ScenarioNotFound } from './scenario-not-found'

const meta = {
  title: 'ScenarioPreparation/ScenarioNotFound',
  component: ScenarioNotFound,
  args: { campaignId: 'story-campaign' },
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof ScenarioNotFound>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
