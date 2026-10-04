import type { Meta, StoryObj } from '@storybook/react-vite'

import { keeperListItem, playerListItem } from '@/campaign-list/test-support/campaignListFixtures'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignListItem } from './campaign-list-item'

const meta = {
  title: 'CampaignList/CampaignListItem',
  component: CampaignListItem,
  decorators: [
    (Story, context) => (
      <StoryProviders>
        <ul className={`${context.parameters.narrow ? 'w-80' : 'max-w-3xl'} divide-y rounded-xl border`}>
          <Story />
        </ul>
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof CampaignListItem>

export default meta
type Story = StoryObj<typeof meta>

export const KeeperAwaitingManyReviews: Story = { args: { item: keeperListItem } }

export const KeeperAwaitingOneReview: Story = { args: { item: { ...keeperListItem, awaitingReviewCount: 1 } } }

export const KeeperNothingToReview: Story = {
  args: { item: { ...keeperListItem, playerCount: 0, approvedInvestigatorCount: 0, awaitingReviewCount: 0 } },
}

export const PlayerDraft: Story = { args: { item: { ...playerListItem, myInvestigator: { status: 'Draft', name: null } } } }

export const PlayerSubmitted: Story = {
  args: { item: { ...playerListItem, myInvestigator: { status: 'Submitted', name: 'Harvey Walters' } } },
}

export const PlayerChangesRequested: Story = { args: { item: playerListItem } }

export const PlayerApproved: Story = {
  args: { item: { ...playerListItem, myInvestigator: { status: 'Approved', name: 'Harvey Walters' } } },
}

export const PlayerWithoutInvestigator: Story = {
  args: { item: { ...playerListItem, playerCount: 1, approvedInvestigatorCount: 0, myInvestigator: null } },
}

/** Long names wrap instead of truncating, shown 320px wide (CL-A11Y-8). */
export const LongNamesAtNarrowWidth: Story = {
  args: {
    item: {
      ...playerListItem,
      name: 'The Haunting of the Corbitt House on the Far Side of Arkham, Massachusetts, in the Winter of 1923',
      keeperName: 'Anastasia Konstantinopoulou-Whitmore',
    },
  },
  parameters: { narrow: true },
}
