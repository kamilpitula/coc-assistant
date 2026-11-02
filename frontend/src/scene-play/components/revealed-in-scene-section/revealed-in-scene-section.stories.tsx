import type { Meta, StoryObj } from '@storybook/react-vite'

import { revealQueryKeys } from '@/scene-play/services/revealApi'
import { entityReveal, keeperReveal, mapReveal, pngBlob, readAloudReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperReveal } from '@/scene-play/types/Reveal'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { RevealedInSceneSection } from './revealed-in-scene-section'

function SectionStory({ reveals }: { reveals: KeeperReveal[] }) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders seed={(client) => client.setQueryData(revealQueryKeys.file('story-campaign', mapReveal.revealId), pngBlob())}>
        <RevealedInSceneSection campaignId="story-campaign" reveals={reveals} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/RevealedInSceneSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { reveals: [] } }

export const SeveralReveals: Story = {
  args: {
    reveals: [
      keeperReveal(mapReveal, 'h-map', ['Harvey Walters']),
      keeperReveal(entityReveal, 'l-1', ['Harvey Walters', 'Lucy Ward']),
      keeperReveal(readAloudReveal, 'h-door', ['Harvey Walters', 'Lucy Ward', 'Mae Doyle']),
    ],
  },
}
