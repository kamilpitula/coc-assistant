import type { Meta, StoryObj } from '@storybook/react-vite'

import { clueOf, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { Clues } from '@/scene-play/types/Reveal'
import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CluesList } from './clues-list'

const corbitt = { id: 's2', title: 'The Corbitt House' }
const knott = { id: 's1', title: 'Meeting Knott' }

function ListStory({ empty = false, offset = false }: { empty?: boolean; offset?: boolean }) {
  const clues: Clues = {
    investigatorName: 'Harvey Walters',
    clues: empty ? [] : [clueOf(textReveal, corbitt), clueOf(readAloudReveal, corbitt), clueOf(textReveal, knott)],
  }
  const list = <CluesList campaignId="story-campaign" clues={clues} />

  return (
    <StoryMsal tokens="pending">
      <StoryProviders>{offset ? <HeadingOffsetProvider value={1}>{list}</HeadingOffsetProvider> : list}</StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/CluesList',
  component: ListStory,
} satisfies Meta<typeof ListStory>

export default meta
type Story = StoryObj<typeof meta>

export const PageLevels: Story = {}

export const PanelLevels: Story = { args: { offset: true } }

export const Empty: Story = { args: { empty: true } }
