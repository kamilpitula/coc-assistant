import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { EditNonPlayerEntityLinkPage } from './edit-non-player-entity-link-page'

const SCENARIO_ID = 'story-scenario'
const SCENE_ID = 'story-scene'
const LINK_ID = 'story-link'

const scene: Scene = {
  id: SCENE_ID,
  title: 'The Corbitt House',
  location: 'Arkham',
  keeperNotes: null,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [
    {
      id: LINK_ID,
      nonPlayerEntity: { id: 'ghoul', type: 'MythosCreature', name: 'Ghoul' },
      playerFacingName: 'A shape in the cellar',
      playerFacingDescription: null,
    },
  ],
  handouts: [],
}

interface StoryArgs {
  scene?: Scene | null
  linkId?: string
  tokens?: 'pending' | 'failing' | 'granted'
}

function PageStory({ scene: shown = scene, linkId = LINK_ID, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)
          client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID, SCENE_ID), shown)
        }}
      >
        <EditNonPlayerEntityLinkPage campaignId={STORY_CAMPAIGN_ID} scenarioId={SCENARIO_ID} sceneId={SCENE_ID} linkId={linkId} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/EditNonPlayerEntityLinkPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

/** The token never arrives, so the save stays in flight. */
export const Busy: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Save' }))
  },
}

/** The save fails with a server error. */
export const Failure: Story = {
  args: { tokens: 'failing' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Save' }))
  },
}

export const Finished: Story = {
  args: { scene: { ...scene, status: 'Finished', startedAt: '2026-10-12T19:40:00Z', finishedAt: '2026-10-12T21:05:00Z' } },
}

export const LinkNotFound: Story = { args: { linkId: 'unknown' } }

export const SceneNotFound: Story = { args: { scene: null } }
