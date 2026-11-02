import type { Meta, StoryObj } from '@storybook/react-vite'

import { revealQueryKeys } from '@/scene-play/services/revealApi'
import { mapReveal, pngBlob, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { RevealedToSection } from './revealed-to-section'

function SectionStory({ withReveals = true }: { withReveals?: boolean }) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders seed={(client) => client.setQueryData(revealQueryKeys.file('story-campaign', mapReveal.revealId), pngBlob())}>
        <RevealedToSection campaignId="story-campaign" investigatorName="Harvey Walters" reveals={withReveals ? [mapReveal, readAloudReveal, textReveal] : []} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/RevealedToSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const SeveralReveals: Story = {}

export const Empty: Story = { args: { withReveals: false } }
