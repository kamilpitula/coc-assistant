import type { Meta, StoryObj } from '@storybook/react-vite'

import { keeperReveal, readAloudReveal } from '@/scene-play/test-support/revealFixtures'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { RevealMetaLine } from './reveal-meta-line'

function MetaLineStory() {
  return (
    <StoryProviders>
      <RevealMetaLine reveal={keeperReveal(readAloudReveal, 'story-handout', ['Harvey Walters', 'Lucy Ward'])} />
    </StoryProviders>
  )
}

const meta = {
  title: 'ScenePlay/RevealMetaLine',
  component: MetaLineStory,
} satisfies Meta<typeof MetaLineStory>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
