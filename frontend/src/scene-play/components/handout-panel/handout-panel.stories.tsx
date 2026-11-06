import type { Meta, StoryObj } from '@storybook/react-vite'

import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { handoutQueryKeys } from '@/scenario-preparation/services/handoutApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { SceneHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import type { Handout } from '@/scenario-preparation/types/Handout'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import type { ActiveScene, KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { HandoutPanel } from './handout-panel'

const owner: SceneHandoutOwner = { type: 'scene', campaignId: STORY_CAMPAIGN_ID, scenarioId: 'story-scenario', sceneId: 'story-scene' }
const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const handout: Handout = {
  id: 'story-handout',
  kind: 'ReadAloud',
  visibility: 'PlayerFacing',
  title: 'The front door',
  content: {
    root: {
      type: 'root',
      children: [
        { type: 'heading', version: 1, tag: 'h3', children: [text('Inside')] },
        { type: 'paragraph', version: 1, children: [text('The door creaks open onto a cold hall.')] },
      ],
    },
  },
}
const keeperScene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: '',
  startedAt: null,
  investigatorsPresent: [{ id: 'i-a', name: 'Dr. Ames' }],
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
  itemLinks: [],
  handouts: [{ id: 'story-handout', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' }],
}
const playerScene: ActiveScene = { kind: 'present-player', title: 'The Corbitt House', location: '', investigatorsPresent: [], reveals: [] }

interface PanelStoryArgs {
  role?: 'Keeper' | 'Player'
  data?: Handout | null
  loading?: boolean
  reveal?: boolean
}

function PanelStory({ role = 'Keeper', data = handout, loading = false, reveal = false }: PanelStoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          if (!loading) {
            client.setQueryData(activeSceneQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperScene : playerScene)
          }
          if (role === 'Keeper' && data !== undefined) {
            client.setQueryData(handoutQueryKeys.detail(owner, 'story-handout'), data)
            client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, 'story-scenario', 'story-scene'), material)
          }
        }}
      >
        <SidePanelScopeProvider>
          <HandoutPanel campaignId={STORY_CAMPAIGN_ID} handoutId="story-handout" onReveal={reveal ? () => undefined : undefined} />
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/HandoutPanel',
  component: PanelStory,
} satisfies Meta<typeof PanelStory>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const Revealable: Story = { args: { reveal: true } }

export const UnknownHandout: Story = { args: { data: null } }

export const Player: Story = { args: { role: 'Player' } }

export const Loading: Story = { args: { loading: true } }
