import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryProviders } from '@/shared/storybook/storyProviders'

import { HandoutNotFound } from './handout-not-found'

const meta = {
  title: 'ScenarioPreparation/HandoutNotFound',
  component: HandoutNotFound,
  args: { owner: { type: 'scene', campaignId: 'story-campaign', scenarioId: 'story-scenario', sceneId: 'story-scene' }, backLabel: 'Back to the Scene' },
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof HandoutNotFound>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
