import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperInvestigator, problem } from '@/campaign-play/test-support/characterSheetFixtures'
import type { KeeperInvestigator } from '@/campaign-play/types/Investigator'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { InvestigatorReview } from './investigator-review'

const campaignId = 'story-campaign'
const investigatorId = 'i1'

function withInvestigator(data: KeeperInvestigator) {
  return (Story: () => React.JSX.Element) => (
    <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.investigator(campaignId, investigatorId), data)}>
      <Story />
    </StoryProviders>
  )
}

const meta = {
  title: 'CampaignPlay/InvestigatorReview',
  component: InvestigatorReview,
  args: { campaignId, investigatorId },
} satisfies Meta<typeof InvestigatorReview>

export default meta
type Story = StoryObj<typeof meta>

export const SubmittedWithWarning: Story = {
  decorators: [
    withInvestigator(
      keeperInvestigator({
        warnings: [problem('PointBuyBelowRecommendation', 'characteristics.INT', 'INT is below the recommended 40. Check with your Keeper.', 'Warning')],
      }),
    ),
  ],
}

export const Approved: Story = { decorators: [withInvestigator(keeperInvestigator({ status: 'Approved' }))] }
