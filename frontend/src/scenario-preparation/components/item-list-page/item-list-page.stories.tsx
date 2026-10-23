import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import type { ItemSummary } from '@/scenario-preparation/types/Item'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ItemListPage } from './item-list-page'

const diary: ItemSummary = { id: 'diary', name: "Walter Corbitt's diary", sceneCount: 2 }
const key: ItemSummary = { id: 'key', name: 'The cellar key', sceneCount: 0 }
const lamp: ItemSummary = { id: 'lamp', name: 'Oil lamp', sceneCount: 1 }
const longName: ItemSummary = {
  id: 'long',
  name: 'A water-stained, leather-bound ledger of the Miskatonic Valley Historical Society with a long and winding name',
  sceneCount: 3,
}

interface StoryArgs {
  role?: 'Keeper' | 'Player'
  items?: ItemSummary[]
  tokens?: 'pending' | 'failing'
  width?: number
}

function PageStory({ role = 'Keeper', items, tokens = 'pending', width }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          if (items) {
            client.setQueryData(itemQueryKeys.list(STORY_CAMPAIGN_ID), items)
          }
        }}
      >
        <div style={width ? { width } : undefined}>
          <ItemListPage campaignId={STORY_CAMPAIGN_ID} />
        </div>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/ItemListPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const EmptyCampaign: Story = { args: { items: [] } }

export const SeveralItems: Story = { args: { items: [diary, key, lamp, longName] } }

/** Below 640px the table becomes a list with a muted line of Scene counts. */
export const ListAt320px: Story = { args: { items: [diary, key, lamp, longName], width: 320 } }

export const NoMatch: Story = {
  args: { items: [diary, key] },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText('Search by name'), 'zzz')
  },
}

export const Loading: Story = {}

export const LoadError: Story = { args: { tokens: 'failing' } }

export const PlayerSeesItemNotFound: Story = { args: { role: 'Player' } }
