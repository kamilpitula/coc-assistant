import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { handoutQueryKeys } from '@/scenario-preparation/services/handoutApi'
import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import type { Handout } from '@/scenario-preparation/types/Handout'
import type { Item } from '@/scenario-preparation/types/Item'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ItemHandoutRoute } from './item-handout-route'

const ITEM_ID = 'story-item'
const HANDOUT_ID = 'story-handout'

const diary: Item = {
  id: ITEM_ID,
  name: "Walter Corbitt's diary",
  playerFacingDescription: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'A leather diary.' }] }] } },
  keeperNotes: null,
  holder: null,
  handouts: [{ id: HANDOUT_ID, kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' }],
  scenes: [],
}
const played: Item = {
  ...diary,
  scenes: [{ scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a1', title: 'The Corbitt House', status: 'Finished' }],
}

const handout: Handout = {
  id: HANDOUT_ID,
  kind: 'Text',
  visibility: 'PlayerFacing',
  title: 'The last entry',
  content: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'I cannot stay here any longer.' }] }] } },
}

interface StoryArgs {
  role?: 'Keeper' | 'Player'
  /** Omitted: the Item is still loading. */
  item?: Item | null
  handoutId?: string
}

function RouteStory({ role = 'Keeper', item: seededItem, handoutId }: StoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          if (seededItem !== undefined) {
            client.setQueryData(itemQueryKeys.detail(STORY_CAMPAIGN_ID, ITEM_ID), seededItem)
          }
          client.setQueryData(handoutQueryKeys.detail({ type: 'item', campaignId: STORY_CAMPAIGN_ID, itemId: ITEM_ID }, HANDOUT_ID), handout)
        }}
      >
        <ItemHandoutRoute campaignId={STORY_CAMPAIGN_ID} itemId={ITEM_ID} handoutId={handoutId} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/ItemHandoutRoute',
  component: RouteStory,
  args: { item: diary },
} satisfies Meta<typeof RouteStory>

export default meta
type Story = StoryObj<typeof meta>

export const HandoutOfAnItemNotInPlay: Story = { args: { handoutId: HANDOUT_ID } }

/** The Item is part of a Scene that has been played: Edit stays, Delete Handout is replaced by a sentence. */
export const HandoutOfAPlayedItem: Story = { args: { handoutId: HANDOUT_ID, item: played } }

export const AddHandout: Story = {}

export const LoadingTheItem: Story = { args: { handoutId: HANDOUT_ID, item: undefined } }

export const UnknownItem: Story = { args: { handoutId: HANDOUT_ID, item: null } }

export const PlayerSeesItemNotFound: Story = { args: { handoutId: HANDOUT_ID, role: 'Player' } }
