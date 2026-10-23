import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import type { Item } from '@/scenario-preparation/types/Item'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'
import type { RichTextDocument } from '@/shared/types/RichText'

import { ItemPage } from './item-page'

const ITEM_ID = 'story-item'

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const doc = (heading: string, body: string): RichTextDocument => ({
  root: {
    type: 'root',
    children: [
      { type: 'heading', version: 1, tag: 'h3', children: [text(heading)] },
      { type: 'paragraph', version: 1, children: [text(body)] },
    ],
  },
})

const diary: Item = {
  id: ITEM_ID,
  name: "Walter Corbitt's diary",
  playerFacingDescription: doc('The diary', 'A leather diary with a torn last page.'),
  keeperNotes: doc('Secret', 'The missing page names the cellar.'),
  holder: null,
  handouts: [
    { id: 'h1', kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' },
    { id: 'h2', kind: 'Image', visibility: 'KeeperFacing', title: 'A photograph of the page' },
  ],
  scenes: [
    { scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a1', title: 'The Corbitt House', status: 'Active' },
    { scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a2', title: 'The cellar', status: 'Prepared' },
  ],
}
const unlinked: Item = { ...diary, keeperNotes: null, handouts: [], scenes: [] }

interface StoryArgs {
  role?: 'Keeper' | 'Player'
  /** Omitted: the Item is still loading. */
  item?: Item | null
  tokens?: 'pending' | 'failing' | 'granted'
}

function PageStory({ role = 'Keeper', item, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          if (item !== undefined) {
            client.setQueryData(itemQueryKeys.detail(STORY_CAMPAIGN_ID, ITEM_ID), item)
          }
        }}
      >
        <ItemPage campaignId={STORY_CAMPAIGN_ID} itemId={ITEM_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/ItemPage',
  component: PageStory,
  args: { item: diary },
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const WithHandoutsAndScenes: Story = {}

export const NotLinkedAndWithoutNotes: Story = { args: { item: unlinked } }

export const Edit: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Edit' }))
  },
}

/** Edit, then Save: the stubbed API accepts the change and the view shows "Item saved.". */
export const Saved: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(JSON.stringify({ ...diary, name: 'The diary' }), { status: 200 }))
    try {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))
      await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
      await canvas.findByText('Item saved.')
    } finally {
      window.fetch = original
    }
  },
}

export const DeleteDialog: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Delete Item' }))
  },
}

/** The delete is answered with 409 because a linked Scene is played: the dialog says why and Delete is disabled. */
export const DeleteRefused: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ title: "An Item linked to an Active or Finished Scene can't be deleted." }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    try {
      await userEvent.click(within(canvasElement).getByRole('button', { name: 'Delete Item' }))
      const dialog = within(document.body)
      await userEvent.click(await dialog.findByRole('button', { name: 'Delete' }))
      await dialog.findByRole('alert')
    } finally {
      window.fetch = original
    }
  },
}

/** The token never arrives, so the Item never loads. */
export const Loading: Story = { args: { item: undefined } }

export const LoadError: Story = { args: { item: undefined, tokens: 'failing' } }

export const ItemNotFound: Story = { args: { item: null } }

export const PlayerSeesItemNotFound: Story = { args: { role: 'Player' } }
