import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { handoutQueryKeys } from '@/scenario-preparation/services/handoutApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Handout } from '@/scenario-preparation/types/Handout'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SceneHandoutRoute } from './scene-handout-route'

const SCENARIO_ID = 'story-scenario'
const SCENE_ID = 'story-scene'
const HANDOUT_ID = 'story-handout'

const scene: Scene = {
  id: SCENE_ID,
  title: 'The Corbitt House',
  location: 'Arkham',
  keeperNotes: null,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [],
  itemLinks: [],
  handouts: [{ id: HANDOUT_ID, kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' }],
}

const handout: Handout = {
  id: HANDOUT_ID,
  kind: 'ReadAloud',
  visibility: 'PlayerFacing',
  title: 'The front door',
  content: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'A cold draught greets you.' }] }] } },
}

interface StoryArgs {
  role?: 'Keeper' | 'Player'
  /** Omitted: the Scene is still loading. */
  scene?: Scene | null
  handoutId?: string
}

function RouteStory({ role = 'Keeper', scene: seededScene, handoutId }: StoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          if (seededScene !== undefined) {
            client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID, SCENE_ID), seededScene)
          }
          client.setQueryData(
            handoutQueryKeys.detail({ type: 'scene', campaignId: STORY_CAMPAIGN_ID, scenarioId: SCENARIO_ID, sceneId: SCENE_ID }, HANDOUT_ID),
            handout,
          )
        }}
      >
        <SceneHandoutRoute campaignId={STORY_CAMPAIGN_ID} scenarioId={SCENARIO_ID} sceneId={SCENE_ID} handoutId={handoutId} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/SceneHandoutRoute',
  component: RouteStory,
  args: { scene },
} satisfies Meta<typeof RouteStory>

export default meta
type Story = StoryObj<typeof meta>

export const HandoutOfAPreparedScene: Story = { args: { handoutId: HANDOUT_ID } }

export const HandoutOfAFinishedScene: Story = {
  args: { handoutId: HANDOUT_ID, scene: { ...scene, status: 'Finished', startedAt: '2026-10-12T19:40:00Z', finishedAt: '2026-10-12T21:05:00Z' } },
}

export const AddHandout: Story = {}

export const LoadingTheScene: Story = { args: { handoutId: HANDOUT_ID, scene: undefined } }

export const UnknownScene: Story = { args: { handoutId: HANDOUT_ID, scene: null } }

export const PlayerSeesSceneNotFound: Story = { args: { handoutId: HANDOUT_ID, role: 'Player' } }
