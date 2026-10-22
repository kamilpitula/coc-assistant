import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { LinkNonPlayerEntityPage } from './link-non-player-entity-page'

const SCENARIO_ID = 'story-scenario'
const SCENE_ID = 'story-scene'

const prepared: Scene = {
  id: SCENE_ID,
  title: 'The Corbitt House',
  location: 'Arkham',
  keeperNotes: null,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [],
  handouts: [],
}
const entities = [
  { id: 'knott', type: 'HumanNpc' as const, name: 'Mr. Knott' },
  { id: 'ghoul', type: 'MythosCreature' as const, name: 'Ghoul' },
]

interface StoryArgs {
  scene?: Scene | null
  tokens?: 'pending' | 'failing' | 'granted'
}

function PageStory({ scene = prepared, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)
          client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID, SCENE_ID), scene)
          client.setQueryData(nonPlayerEntityQueryKeys.list(STORY_CAMPAIGN_ID), entities)
        }}
      >
        <LinkNonPlayerEntityPage campaignId={STORY_CAMPAIGN_ID} scenarioId={SCENARIO_ID} sceneId={SCENE_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/LinkNonPlayerEntityPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

/** The token never arrives, so the link stays in flight. */
export const Busy: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('radio', { name: 'Ghoul' }))
    await userEvent.type(canvas.getByLabelText('Player-facing name'), 'A shape in the cellar')
    const buttons = canvas.getAllByRole('button', { name: 'Link' })
    await userEvent.click(buttons[buttons.length - 1])
  },
}

/** The save fails with a server error. */
export const Failure: Story = {
  args: { tokens: 'failing' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('radio', { name: 'Ghoul' }))
    await userEvent.type(canvas.getByLabelText('Player-facing name'), 'A shape in the cellar')
    const buttons = canvas.getAllByRole('button', { name: 'Link' })
    await userEvent.click(buttons[buttons.length - 1])
  },
}

export const Finished: Story = {
  args: { scene: { ...prepared, status: 'Finished', startedAt: '2026-10-12T19:40:00Z', finishedAt: '2026-10-12T21:05:00Z' } },
}

export const NotFound: Story = { args: { scene: null } }
