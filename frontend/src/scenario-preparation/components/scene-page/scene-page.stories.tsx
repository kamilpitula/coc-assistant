import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'
import type { RichTextDocument } from '@/shared/types/RichText'

import { ScenePage } from './scene-page'

const SCENARIO_ID = 'story-scenario'
const SCENE_ID = 'story-scene'

const text = (value: string, format = 0) => ({ type: 'text', version: 1, text: value, format, style: '', detail: 0, mode: 'normal' })
const notes: RichTextDocument = {
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text('The cellar')] },
      { type: 'paragraph', version: 1, children: [text('The key is '), text('under the stairs', 1), text('.')] },
    ],
  },
}

const prepared: Scene = {
  id: SCENE_ID,
  title: 'The Corbitt House',
  location: 'Arkham, Boston Road',
  keeperNotes: notes,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
}

interface StoryArgs {
  role?: 'Keeper' | 'Player'
  scene?: Scene
  tokens?: 'pending' | 'failing' | 'granted'
}

function PageStory({ role = 'Keeper', scene = prepared, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID, SCENE_ID), scene)
        }}
      >
        <ScenePage campaignId={STORY_CAMPAIGN_ID} scenarioId={SCENARIO_ID} sceneId={SCENE_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/ScenePage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const PreparedWithLocationAndNotes: Story = {}

export const PreparedWithoutLocationAndNotes: Story = { args: { scene: { ...prepared, location: '', keeperNotes: null } } }

export const Active: Story = {
  args: { scene: { ...prepared, status: 'Active', startedAt: '2026-10-12T19:40:00Z' } },
}

export const Finished: Story = {
  args: { scene: { ...prepared, status: 'Finished', startedAt: '2026-10-12T19:40:00Z', finishedAt: '2026-10-12T21:05:00Z' } },
}

export const Edit: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Edit' }))
  },
}

/** Edit, then Save: the stubbed API accepts the change and the view shows "Scene saved.". */
export const SavedStatus: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(JSON.stringify({ ...prepared, title: 'The Corbitt Cellar' }), { status: 200 }))
    try {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))
      await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
      await canvas.findByText('Scene saved.')
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

async function openRemoveDialogAndConfirm(canvasElement: HTMLElement) {
  await userEvent.click(within(canvasElement).getByRole('button', { name: 'Remove Scene' }))
  const dialog = within(canvasElement.ownerDocument.body)
  const buttons = await dialog.findAllByRole('button', { name: 'Remove Scene' })
  await userEvent.click(buttons[buttons.length - 1])
  return dialog
}

export const RemoveDialog: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Remove Scene' }))
  },
}

/** The token never arrives, so the removal stays in flight. */
export const RemoveDialogRemoving: Story = {
  play: async ({ canvasElement }) => {
    await openRemoveDialogAndConfirm(canvasElement)
  },
}

export const RemoveDialogFailure: Story = {
  args: { tokens: 'failing' },
  play: async ({ canvasElement }) => {
    await openRemoveDialogAndConfirm(canvasElement)
  },
}

/** The removal is answered with 409 because the Scene has been started meanwhile. */
export const RemoveDialogRefused: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(null, { status: 409 }))
    try {
      const dialog = await openRemoveDialogAndConfirm(canvasElement)
      await dialog.findByText("This Scene has been started, so it can't be removed.")
    } finally {
      window.fetch = original
    }
  },
}

/** A Player gets the same page as an unknown Scene and no request is made. */
export const NotFound: Story = { args: { role: 'Player' } }
