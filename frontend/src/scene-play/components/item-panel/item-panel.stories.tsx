import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, keeperRosterAllApproved, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Item } from '@/scenario-preparation/types/Item'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import type { ActiveScene, KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ItemPanel } from './item-panel'

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const paragraph = (value: string) => ({ type: 'paragraph', version: 1, children: [text(value)] })

const item: Item = {
  id: 'story-item',
  name: "Walter Corbitt's diary",
  playerFacingDescription: { root: { type: 'root', children: [paragraph("Walter Corbitt's diary.")] } },
  keeperNotes: { root: { type: 'root', children: [paragraph('The diary bites back.')] } },
  holder: { investigatorId: 'story-investigator' },
  handouts: [{ id: 'story-handout', kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' }],
  scenes: [],
}
const keeperScene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [
    { id: 'story-investigator', name: 'Harvey Walters' },
    { id: 'story-other', name: 'Lucy Ward' },
  ],
  reveals: [],
}
const material: Scene = {
  id: 'story-scene',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: null,
  finishedAt: null,
  location: '',
  keeperNotes: null,
  nonPlayerEntityLinks: [],
  itemLinks: [{ id: 'story-link', item: { id: 'story-item', name: "Walter Corbitt's diary", holder: { investigatorId: 'story-investigator' }, handouts: item.handouts } }],
  handouts: [],
}
const playerScene: ActiveScene = { kind: 'present-player', title: 'The Corbitt House', location: '', investigatorsPresent: [], reveals: [] }

interface PanelStoryArgs {
  role?: 'Keeper' | 'Player'
  data?: Item | null
  loading?: boolean
  reveal?: boolean
}

function PanelStory({ role = 'Keeper', data = item, loading = false, reveal = false }: PanelStoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          client.setQueryData(campaignQueryKeys.members(STORY_CAMPAIGN_ID), keeperRosterAllApproved)
          if (!loading) {
            client.setQueryData(activeSceneQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperScene : playerScene)
          }
          if (role === 'Keeper' && data !== undefined) {
            client.setQueryData(itemQueryKeys.detail(STORY_CAMPAIGN_ID, 'story-item'), data)
            client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, 'story-scenario', 'story-scene'), material)
          }
        }}
      >
        <SidePanelScopeProvider>
          <ItemPanel campaignId={STORY_CAMPAIGN_ID} itemId="story-item" onReveal={reveal ? () => undefined : undefined} />
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/ItemPanel',
  component: PanelStory,
} satisfies Meta<typeof PanelStory>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const Revealable: Story = { args: { reveal: true } }

export const UnknownItem: Story = { args: { data: null } }

export const Player: Story = { args: { role: 'Player' } }

export const Loading: Story = { args: { loading: true } }
