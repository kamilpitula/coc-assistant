import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignListQueryKeys } from '@/campaign-list/services/campaignListApi'
import { keeperListItem, playerListItem } from '@/campaign-list/test-support/campaignListFixtures'
import type { CampaignListItem } from '@/campaign-list/types/CampaignListItem'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignList } from './campaign-list'

interface StoryArgs {
  /** The seeded list; undefined leaves it loading (or failing, with failing tokens). */
  items?: CampaignListItem[]
  tokens: 'pending' | 'failing'
}

function CampaignListStory({ items, tokens }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders seed={(client) => items && client.setQueryData(campaignListQueryKeys.list, items)}>
        <CampaignList />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'CampaignList/CampaignList',
  component: CampaignListStory,
} satisfies Meta<typeof CampaignListStory>

export default meta
type Story = StoryObj<typeof meta>

export const BothSections: Story = {
  args: {
    items: [
      keeperListItem,
      { ...keeperListItem, id: 'c3', name: 'Masks of Nyarlathotep', awaitingReviewCount: 0, approvedInvestigatorCount: 0 },
      playerListItem,
    ],
    tokens: 'pending',
  },
}

export const KeeperOnly: Story = { args: { items: [keeperListItem], tokens: 'pending' } }

export const PlayerOnly: Story = { args: { items: [playerListItem], tokens: 'pending' } }

export const Empty: Story = { args: { items: [], tokens: 'pending' } }

export const Loading: Story = { args: { tokens: 'pending' } }

export const LoadError: Story = { args: { tokens: 'failing' } }
