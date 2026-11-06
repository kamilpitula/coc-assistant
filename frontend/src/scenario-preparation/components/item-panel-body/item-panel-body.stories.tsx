import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import type { Item } from '@/scenario-preparation/types/Item'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'
import type { RichTextDocument } from '@/shared/types/RichText'

import { ItemPanelBody } from './item-panel-body'

const CAMPAIGN_ID = 'story-campaign'
const ITEM_ID = 'story-item'

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const paragraph = (value: string) => ({ type: 'paragraph', version: 1, children: [text(value)] })
const description: RichTextDocument = { root: { type: 'root', children: [paragraph("Walter Corbitt's diary.")] } }
const notes: RichTextDocument = { root: { type: 'root', children: [paragraph('The diary bites back.')] } }

const members: CampaignMember[] = [
  {
    memberId: 'story-member',
    displayName: 'Harvey Walters',
    role: 'Player',
    isYou: false,
    investigator: { visibility: 'Visible', id: 'story-investigator', name: 'Harvey Walters', status: 'Approved' },
  },
]

const item: Item = {
  id: ITEM_ID,
  name: "Walter Corbitt's diary",
  playerFacingDescription: description,
  keeperNotes: notes,
  holder: { investigatorId: 'story-investigator' },
  handouts: [{ id: 'story-handout', kind: 'Text', visibility: 'PlayerFacing', title: 'The last entry' }],
  scenes: [],
}

interface BodyStoryArgs {
  data?: Item | null
  loading?: boolean
  failing?: boolean
}

function BodyStory({ data = item, loading = false, failing = false }: BodyStoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.members(CAMPAIGN_ID), members)
          if (failing) {
            void client.prefetchQuery({ queryKey: itemQueryKeys.detail(CAMPAIGN_ID, ITEM_ID), queryFn: () => Promise.reject(new Error('No')) })
          } else if (!loading && data !== undefined) {
            client.setQueryData(itemQueryKeys.detail(CAMPAIGN_ID, ITEM_ID), data)
          }
        }}
      >
        <SidePanelScopeProvider>
          <ItemPanelBody campaignId={CAMPAIGN_ID} itemId={ITEM_ID} from="active-scene" />
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/ItemPanelBody',
  component: BodyStory,
} satisfies Meta<typeof BodyStory>

export default meta
type Story = StoryObj<typeof meta>

export const Held: Story = {}

export const NotHeld: Story = { args: { data: { ...item, holder: null } } }

export const NoHandouts: Story = { args: { data: { ...item, holder: null, handouts: [], keeperNotes: null } } }

export const Loading: Story = { args: { data: undefined, loading: true } }

export const Failure: Story = { args: { data: undefined, failing: true } }

export const NotFound: Story = { args: { data: null } }
