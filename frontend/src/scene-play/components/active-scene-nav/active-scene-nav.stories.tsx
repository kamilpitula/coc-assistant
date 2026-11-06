import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ActiveSceneNav } from './active-scene-nav'

function NavStory() {
  return (
    <StoryProviders>
      <ActiveSceneNav campaignId="story-campaign" current="to-reveal" counts={{ toReveal: 4, reference: 5, revealed: 2 }} />
    </StoryProviders>
  )
}

const meta = {
  title: 'ScenePlay/ActiveSceneNav',
  component: NavStory,
} satisfies Meta<typeof NavStory>

export default meta
type Story = StoryObj<typeof meta>

export const ToReveal: Story = {}

export const Loading: Story = {
  render: () => (
    <StoryProviders>
      <ActiveSceneNav campaignId="story-campaign" current="run" counts={null} />
    </StoryProviders>
  ),
}
