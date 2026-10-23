import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { ItemSummary } from '@/scenario-preparation/types/Item'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { LinkItemPage } from './link-item-page'

const SCENARIO_ID = 'story-scenario'
const SCENE_ID = 'story-scene'

const diary: ItemSummary = { id: 'diary', name: "Walter Corbitt's diary", sceneCount: 1 }
const key: ItemSummary = { id: 'key', name: 'The cellar key', sceneCount: 0 }
const lamp: ItemSummary = { id: 'lamp', name: 'Oil lamp', sceneCount: 0 }

const prepared: Scene = {
  id: SCENE_ID,
  title: 'The Corbitt House',
  location: 'Arkham',
  keeperNotes: null,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [],
  itemLinks: [{ id: 'link-1', item: { id: 'diary', name: "Walter Corbitt's diary" } }],
  handouts: [],
}

interface StoryArgs {
  role?: 'Keeper' | 'Player'
  scene?: Scene | null
  items?: ItemSummary[]
  tokens?: 'pending' | 'failing'
}

function PageStory({ role = 'Keeper', scene = prepared, items = [diary, key, lamp], tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID, SCENE_ID), scene)
          client.setQueryData(itemQueryKeys.list(STORY_CAMPAIGN_ID), items)
        }}
      >
        <LinkItemPage campaignId={STORY_CAMPAIGN_ID} scenarioId={SCENARIO_ID} sceneId={SCENE_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/LinkItemPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const ItemChosen: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('radio', { name: 'The cellar key' }))
  },
}

/** Submitting without a choice says "Choose an Item." at the picker. */
export const NothingChosen: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Link' }))
  },
}

/** The token never arrives, so the link stays in flight. */
export const Linking: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('radio', { name: 'The cellar key' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Link' }))
  },
}

export const LinkFailure: Story = {
  args: { tokens: 'failing' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('radio', { name: 'The cellar key' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Link' }))
  },
}

export const EmptyCampaign: Story = { args: { items: [] } }

export const FinishedScene: Story = {
  args: { scene: { ...prepared, status: 'Finished', startedAt: '2026-10-12T19:40:00Z', finishedAt: '2026-10-12T21:05:00Z' } },
}

export const UnknownScene: Story = { args: { scene: null } }

export const PlayerSeesSceneNotFound: Story = { args: { role: 'Player' } }
