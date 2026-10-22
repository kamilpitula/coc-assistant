import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { handoutQueryKeys } from '@/scenario-preparation/services/handoutApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Handout } from '@/scenario-preparation/types/Handout'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'
import type { RichTextDocument } from '@/shared/types/RichText'

import { HandoutPage } from './handout-page'

const SCENARIO_ID = 'story-scenario'
const SCENE_ID = 'story-scene'
const HANDOUT_ID = 'story-handout'

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const content: RichTextDocument = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('The porch')] },
      { type: 'paragraph', version: 1, children: [text('A cold draught greets you as the door swings inward.')] },
    ],
  },
}

const readAloud: Handout = { id: HANDOUT_ID, kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door', content }
const letter: Handout = { ...readAloud, kind: 'Text', visibility: 'KeeperFacing', title: "Corbitt's letter" }

const prepared: Scene = {
  id: SCENE_ID,
  title: 'The Corbitt House',
  location: 'Arkham',
  keeperNotes: null,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [],
  handouts: [{ id: HANDOUT_ID, kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' }],
}
const active: Scene = { ...prepared, status: 'Active', startedAt: '2026-10-12T19:40:00Z' }
const finished: Scene = { ...active, status: 'Finished', finishedAt: '2026-10-12T21:05:00Z' }

interface StoryArgs {
  role?: 'Keeper' | 'Player'
  scene?: Scene
  /** Omitted: the Handout is still loading. */
  handout?: Handout | null
  tokens?: 'pending' | 'failing' | 'granted'
}

function PageStory({ role = 'Keeper', scene = prepared, handout, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID, SCENE_ID), scene)
          if (handout !== undefined) {
            client.setQueryData(handoutQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID, SCENE_ID, HANDOUT_ID), handout)
          }
        }}
      >
        <HandoutPage campaignId={STORY_CAMPAIGN_ID} scenarioId={SCENARIO_ID} sceneId={SCENE_ID} handoutId={HANDOUT_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/HandoutPage',
  component: PageStory,
  args: { handout: readAloud },
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const ReadAloudPrepared: Story = {}

export const TextPrepared: Story = { args: { handout: letter } }

export const ReadAloudActive: Story = { args: { scene: active } }

export const TextActive: Story = { args: { scene: active, handout: letter } }

export const ReadAloudFinished: Story = { args: { scene: finished } }

export const TextFinished: Story = { args: { scene: finished, handout: letter } }

export const Edit: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Edit' }))
  },
}

/** Edit, then Save: the stubbed API accepts the change and the view shows "Handout saved.". */
export const Saved: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(JSON.stringify({ ...readAloud, title: 'The back door' }), { status: 200 }))
    try {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))
      await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
      await canvas.findByText('Handout saved.')
    } finally {
      window.fetch = original
    }
  },
}

/** The save is answered with 409 because the Scene was finished meanwhile. */
export const SaveRefusedAsFinished: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(null, { status: 409 }))
    try {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))
      await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
      await canvas.findByRole('alert')
    } finally {
      window.fetch = original
    }
  },
}

/** The token never arrives, so the Handout never loads. */
export const Loading: Story = { args: { handout: undefined } }

export const LoadError: Story = { args: { handout: undefined, tokens: 'failing' } }

export const HandoutNotFound: Story = { args: { handout: null } }

export const PlayerSeesSceneNotFound: Story = { args: { role: 'Player' } }
