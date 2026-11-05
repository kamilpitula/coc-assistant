import type { Meta, StoryObj } from '@storybook/react-vite'

import { handoutQueryKeys } from '@/scenario-preparation/services/handoutApi'
import type { Handout } from '@/scenario-preparation/types/Handout'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'
import type { RichTextDocument } from '@/shared/types/RichText'

import { HandoutPreview } from './handout-preview'

/** The 1x1 PNG and the one-paragraph document this story needs, kept here so the story imports no other slice (ADR-0028). */
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

function pngBlob(): Blob {
  return new Blob([Uint8Array.from(atob(PNG_BASE64), (character) => character.charCodeAt(0))], { type: 'image/png' })
}

function paragraph(value: string): RichTextDocument {
  return {
    root: {
      type: 'root',
      children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' }] }],
    },
  }
}

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
