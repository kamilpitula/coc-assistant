import type { Meta, StoryObj } from '@storybook/react-vite'

import { nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'
import { thugHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import type { NonPlayerEntityLink, Scene } from '@/scenario-preparation/types/Scene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'
import type { RichTextDocument } from '@/shared/types/RichText'

import { EntityPanelBody } from './entity-panel-body'

function paragraph(value: string): RichTextDocument {
  return {
    root: {
      type: 'root',
      children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' }] }],
    },
  }
}

const npcLink: NonPlayerEntityLink = {
  id: 'story-link-npc',
  nonPlayerEntity: { id: 'story-human-npc', type: 'HumanNpc', name: 'Thug' },
  playerFacingName: 'The man by the gate',
  playerFacingDescription: paragraph('A broad man in a grey suit watches the house.'),
}
const creatureLink: NonPlayerEntityLink = {
  id: 'story-link-creature',
  nonPlayerEntity: { id: 'story-mythos-creature', type: 'MythosCreature', name: 'Ghoul' },
  playerFacingName: 'A shape in the cellar',
  playerFacingDescription: null,
}
const material: Scene = {
  id: 'story-scene',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: '2026-10-12T19:40:00Z',
  finishedAt: null,
  location: '',
  keeperNotes: null,
  nonPlayerEntityLinks: [npcLink, creatureLink],
  itemLinks: [],
  handouts: [],
}

interface BodyStoryArgs {
  linkId?: string
}

function BodyStory({ linkId = 'story-link-npc' }: BodyStoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(sceneQueryKeys.detail('story-campaign', 'story-scenario', 'story-scene'), material)
          client.setQueryData(nonPlayerEntityQueryKeys.humanNpc('story-campaign', 'story-human-npc'), thugHumanNpc)
          client.setQueryData(nonPlayerEntityQueryKeys.mythosCreature('story-campaign', 'story-mythos-creature'), ghoulMythosCreature)
        }}
      >
        <SidePanelScopeProvider>
          <EntityPanelBody campaignId="story-campaign" scenarioId="story-scenario" sceneId="story-scene" linkId={linkId} />
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/EntityPanelBody',
  component: BodyStory,
} satisfies Meta<typeof BodyStory>

export default meta
type Story = StoryObj<typeof meta>

export const HumanNpc: Story = {}

export const MythosCreature: Story = { args: { linkId: 'story-link-creature' } }

export const UnknownLink: Story = { args: { linkId: 'unknown' } }
