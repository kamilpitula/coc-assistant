import type { Meta, StoryObj } from '@storybook/react-vite'

import { handoutQueryKeys } from '@/scenario-preparation/services/handoutApi'
import type { Handout } from '@/scenario-preparation/types/Handout'
import { paragraph, pngBlob } from '@/scene-play/test-support/revealFixtures'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { HandoutPreview } from './handout-preview'

const OWNER = { type: 'scene', campaignId: 'story-campaign', scenarioId: 'story-scenario', sceneId: 'story-scene' } as const

const readAloud: Handout = { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door', content: paragraph('The door creaks open.') }
const map: Handout = {
  id: 'h2',
  kind: 'Map',
  visibility: 'PlayerFacing',
  title: 'Corbitt House cellar',
  file: { name: 'cellar.png', mediaType: 'image/png', sizeBytes: 1_258_291 },
  imageDescription: 'A plan of the cellar',
}

function PreviewStory({ handout, loading = false }: { handout: Handout; loading?: boolean }) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          if (!loading) {
            client.setQueryData(handoutQueryKeys.detail(OWNER, handout.id), handout)
            client.setQueryData(handoutQueryKeys.file(OWNER, handout.id), pngBlob())
          }
        }}
      >
        <HandoutPreview owner={OWNER} handoutId={handout.id} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/HandoutPreview',
  component: PreviewStory,
} satisfies Meta<typeof PreviewStory>

export default meta
type Story = StoryObj<typeof meta>

export const ReadAloud: Story = { args: { handout: readAloud } }

export const MapWithDescription: Story = { args: { handout: map } }

export const Loading: Story = { args: { handout: readAloud, loading: true } }
