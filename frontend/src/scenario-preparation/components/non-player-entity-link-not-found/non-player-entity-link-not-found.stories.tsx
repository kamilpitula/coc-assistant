import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryProviders } from '@/shared/storybook/storyProviders'

import { NonPlayerEntityLinkNotFound } from './non-player-entity-link-not-found'

const meta = {
  title: 'ScenarioPreparation/NonPlayerEntityLinkNotFound',
  component: NonPlayerEntityLinkNotFound,
  args: { campaignId: 'story-campaign', scenarioId: 'story-scenario', sceneId: 'story-scene' },
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof NonPlayerEntityLinkNotFound>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
