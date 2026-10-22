import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { AddHandoutPage } from './add-handout-page'

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

interface StoryArgs {
  scene?: Scene
  tokens?: 'pending' | 'failing' | 'granted'
}

function PageStory({ scene = prepared, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)
          client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID, SCENE_ID), scene)
        }}
      >
        <AddHandoutPage campaignId={STORY_CAMPAIGN_ID} scenarioId={SCENARIO_ID} sceneId={SCENE_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/AddHandoutPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

async function fillAndSubmit(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  await userEvent.type(canvas.getByLabelText('Title'), 'The front door')
  await userEvent.click(canvas.getByRole('radio', { name: 'Read-aloud' }))
  await userEvent.click(canvas.getByRole('radio', { name: 'Player-facing' }))
  await userEvent.type(canvas.getByRole('textbox', { name: 'Text' }), 'You stand before the door.')
  const buttons = canvas.getAllByRole('button', { name: 'Add Handout' })
  await userEvent.click(buttons[buttons.length - 1])
}

/** The token never arrives, so the add stays in flight. */
export const Adding: Story = { play: async ({ canvasElement }) => fillAndSubmit(canvasElement) }

/** The save fails with a server error. */
export const Failure: Story = {
  args: { tokens: 'failing' },
  play: async ({ canvasElement }) => fillAndSubmit(canvasElement),
}

export const Finished: Story = {
  args: { scene: { ...prepared, status: 'Finished', startedAt: '2026-10-12T19:40:00Z', finishedAt: '2026-10-12T21:05:00Z' } },
}
