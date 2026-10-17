import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SceneNotFound } from './scene-not-found'

const meta = {
  title: 'ScenarioPreparation/SceneNotFound',
  component: SceneNotFound,
  args: { campaignId: 'story-campaign' },
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof SceneNotFound>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
