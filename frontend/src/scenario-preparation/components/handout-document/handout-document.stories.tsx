import type { Meta, StoryObj } from '@storybook/react-vite'

import { handoutQueryKeys } from '@/scenario-preparation/services/handoutApi'
import type { FileHandout } from '@/scenario-preparation/types/Handout'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { HandoutDocument } from './handout-document'

const OWNER = { type: 'scene', campaignId: 'story-campaign', scenarioId: 'story-scenario', sceneId: 'story-scene' } as const

const diary: FileHandout = {
  id: 'story-handout',
  kind: 'Document',
  visibility: 'KeeperFacing',
  title: 'Diary',
  file: { name: 'diary-page.pdf', mediaType: 'application/pdf', sizeBytes: 1_258_291 },
}

interface StoryArgs {
  state?: 'loaded' | 'loading' | 'error'
}

function DocumentStory({ state = 'loaded' }: StoryArgs) {
  return (
    <StoryMsal tokens={state === 'error' ? 'failing' : 'pending'}>
      <StoryProviders
        seed={(client) => {
          if (state === 'loaded') {
            client.setQueryData(
              handoutQueryKeys.file(OWNER, diary.id),
              new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
            )
          }
        }}
      >
        <HandoutDocument owner={OWNER} handout={diary} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/HandoutDocument',
  component: DocumentStory,
} satisfies Meta<typeof DocumentStory>

export default meta
type Story = StoryObj<typeof meta>

export const Loaded: Story = {}

export const Loading: Story = { args: { state: 'loading' } }

export const LoadError: Story = { args: { state: 'error' } }
