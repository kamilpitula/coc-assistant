import type { Meta, StoryObj } from '@storybook/react-vite'

import { revealQueryKeys } from '@/scene-play/services/revealApi'
import {
  documentReveal,
  entityReveal,
  imageReveal,
  mapReveal,
  pngBlob,
  readAloudReveal,
  textReveal,
} from '@/scene-play/test-support/revealFixtures'
import type { PlayerReveal } from '@/scene-play/types/Reveal'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { RevealedContent } from './revealed-content'

interface StoryArgs {
  reveal: PlayerReveal
  state?: 'loaded' | 'loading' | 'error'
}

function ContentStory({ reveal, state = 'loaded' }: StoryArgs) {
  return (
    <StoryMsal tokens={state === 'error' ? 'failing' : 'pending'}>
      <StoryProviders
        seed={(client) => {
          if (state === 'loaded') {
            client.setQueryData(revealQueryKeys.file('story-campaign', reveal.revealId), pngBlob())
          }
        }}
      >
        <RevealedContent campaignId="story-campaign" reveal={reveal} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/RevealedContent',
  component: ContentStory,
} satisfies Meta<typeof ContentStory>

export default meta
type Story = StoryObj<typeof meta>

export const ReadAloud: Story = { args: { reveal: readAloudReveal } }

export const Text: Story = { args: { reveal: textReveal } }

export const NonPlayerEntity: Story = { args: { reveal: entityReveal } }

export const Map: Story = { args: { reveal: mapReveal } }

export const ImageWithDescription: Story = { args: { reveal: { ...imageReveal, imageDescription: 'A photograph of the house' } } }

export const ImageWithoutDescription: Story = { args: { reveal: imageReveal } }

export const Document: Story = { args: { reveal: documentReveal } }

export const Loading: Story = { args: { reveal: mapReveal, state: 'loading' } }

export const LoadFailure: Story = { args: { reveal: mapReveal, state: 'error' } }
