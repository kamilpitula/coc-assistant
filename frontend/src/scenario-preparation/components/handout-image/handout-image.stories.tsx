import type { Meta, StoryObj } from '@storybook/react-vite'

import { handoutQueryKeys } from '@/scenario-preparation/services/handoutApi'
import type { FileHandout } from '@/scenario-preparation/types/Handout'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { HandoutImage } from './handout-image'

const IDS = { campaignId: 'story-campaign', scenarioId: 'story-scenario', sceneId: 'story-scene' }
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const image: FileHandout = {
  id: 'story-handout',
  kind: 'Image',
  visibility: 'PlayerFacing',
  title: 'Corbitt House',
  file: { name: 'corbitt-house.png', mediaType: 'image/png', sizeBytes: 1_258_291 },
}

interface StoryArgs {
  handout?: FileHandout
  /** Omitted: the image is still loading. */
  state?: 'loaded' | 'loading' | 'error'
  tokens?: 'pending' | 'failing' | 'granted'
}

function ImageStory({ handout = image, state = 'loaded', tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={state === 'error' ? 'failing' : tokens}>
      <StoryProviders
        seed={(client) => {
          if (state === 'loaded') {
            const bytes = Uint8Array.from(atob(PNG), (character) => character.charCodeAt(0))
            client.setQueryData(
              handoutQueryKeys.file(IDS.campaignId, IDS.scenarioId, IDS.sceneId, handout.id),
              new Blob([bytes], { type: 'image/png' }),
            )
          }
        }}
      >
        <HandoutImage {...IDS} handout={handout} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/HandoutImage',
  component: ImageStory,
} satisfies Meta<typeof ImageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Image: Story = {}

export const Map: Story = { args: { handout: { ...image, kind: 'Map', title: 'Arkham' } } }

export const TallMapAt320px: Story = {
  args: { handout: { ...image, kind: 'Map', title: 'A very long street map of the whole of Arkham and its surroundings' } },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
}

export const Loading: Story = { args: { state: 'loading' } }

export const LoadError: Story = { args: { state: 'error' } }
