import type { Meta, StoryObj } from '@storybook/react-vite'

import type { NonPlayerEntityLink } from '@/scenario-preparation/types/Scene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'
import type { RichTextDocument } from '@/shared/types/RichText'

import { SceneLinkSection } from './scene-link-section'

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const description: RichTextDocument = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('What it looks like')] },
      { type: 'paragraph', version: 1, children: [text('Grey, wet, and standing very still.')] },
      { type: 'heading', version: 1, tag: 'h4', children: [text('The smell')] },
      { type: 'paragraph', version: 1, children: [text('Earth and old meat.')] },
    ],
  },
}

const ghoul: NonPlayerEntityLink = {
  id: 'link-1',
  nonPlayerEntity: { id: 'ghoul', type: 'MythosCreature', name: 'Ghoul' },
  playerFacingName: 'A shape in the cellar',
  playerFacingDescription: description,
}
const knott: NonPlayerEntityLink = {
  id: 'link-2',
  nonPlayerEntity: { id: 'knott', type: 'HumanNpc', name: 'Mr. Knott' },
  playerFacingName: 'The landlord',
  playerFacingDescription: null,
}
const longName: NonPlayerEntityLink = {
  id: 'link-3',
  nonPlayerEntity: { id: 'long', type: 'HumanNpc', name: 'Bartholomew Archibald Winthrop-Ellsworth the Third of the Miskatonic Valley Historical Society' },
  playerFacingName: 'A very long Player-facing name that keeps going and going so that it has to wrap at 320 pixels wide without overflowing',
  playerFacingDescription: null,
}

interface StoryArgs {
  links: NonPlayerEntityLink[]
  status?: 'Prepared' | 'Active' | 'Finished'
  width?: number
}

function SectionStory({ links, status = 'Prepared', width }: StoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders>
        <div style={width ? { width } : undefined}>
          <SceneLinkSection
            campaignId="story-campaign"
            scenarioId="story-scenario"
            sceneId="story-scene"
            status={status}
            links={links}
            onUnlinked={() => undefined}
            onRefetch={() => undefined}
          />
        </div>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/SceneLinkSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { links: [] } }

export const LinksWithAndWithoutDescription: Story = { args: { links: [ghoul, knott] } }

export const Active: Story = { args: { links: [ghoul, knott], status: 'Active' } }

export const Finished: Story = { args: { links: [ghoul, knott], status: 'Finished' } }

export const LongNameAt320: Story = { args: { links: [longName], width: 320 } }
