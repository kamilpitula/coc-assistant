import type { Meta, StoryObj } from '@storybook/react-vite'

import { itemQueryKeys } from '@/scenario-preparation/services/itemApi'
import type { ItemSummary } from '@/scenario-preparation/types/Item'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ItemSummarySection } from './item-summary-section'

const CAMPAIGN_ID = 'story-campaign'

const item = (id: string): ItemSummary => ({ id, name: `Item ${id}`, sceneCount: 0 })

interface StoryArgs {
  items?: ItemSummary[]
  tokens?: 'pending' | 'failing'
}

function SectionStory({ items, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          if (items) {
            client.setQueryData(itemQueryKeys.list(CAMPAIGN_ID), items)
          }
        }}
      >
        <ItemSummarySection campaignId={CAMPAIGN_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/ItemSummarySection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { items: [] } }
export const OneItem: Story = { args: { items: [item('1')] } }
export const SeveralItems: Story = { args: { items: [item('1'), item('2'), item('3'), item('4')] } }
export const Loading: Story = {}
export const LoadError: Story = { args: { tokens: 'failing' } }
