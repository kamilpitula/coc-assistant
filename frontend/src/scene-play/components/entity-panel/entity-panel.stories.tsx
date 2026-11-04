import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'
import { thugHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import type { NonPlayerEntityLink, Scene } from '@/scenario-preparation/types/Scene'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { paragraph } from '@/scene-play/test-support/revealFixtures'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { EntityPanel } from './entity-panel'

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [],
  reveals: [],
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

interface PanelStoryArgs {
  linkId?: string
}

function PanelStory({ linkId = 'story-link-npc' }: PanelStoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)
          client.setQueryData(activeSceneQueryKeys.detail(STORY_CAMPAIGN_ID), scene)
          client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, 'story-scenario', 'story-scene'), material)
          client.setQueryData(nonPlayerEntityQueryKeys.humanNpc(STORY_CAMPAIGN_ID, 'story-human-npc'), thugHumanNpc)
          client.setQueryData(nonPlayerEntityQueryKeys.mythosCreature(STORY_CAMPAIGN_ID, 'story-mythos-creature'), ghoulMythosCreature)
        }}
      >
        <SidePanelScopeProvider>
          <EntityPanel campaignId={STORY_CAMPAIGN_ID} linkId={linkId} />
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/EntityPanel',
  component: PanelStory,
} satisfies Meta<typeof PanelStory>

export default meta
type Story = StoryObj<typeof meta>

export const HumanNpc: Story = {}

export const MythosCreature: Story = { args: { linkId: 'story-link-creature' } }

export const UnknownLink: Story = { args: { linkId: 'unknown' } }
