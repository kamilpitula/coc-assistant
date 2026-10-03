import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { InvestigatorListItem } from '@/campaign-play/types/Investigator'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { InvestigatorList } from './investigator-list'

const campaignId = 'story-campaign'

const rows: InvestigatorListItem[] = [
  { playerAccountId: 'p1', playerName: 'Ada Lovelace', status: 'Submitted', investigatorId: 'i1', investigatorName: 'Harvey Walters', updatedAt: '2026-10-02T10:00:00Z' },
  { playerAccountId: 'p2', playerName: 'Charles Babbage', status: 'Draft', investigatorId: null, investigatorName: null, updatedAt: '2026-10-01T10:00:00Z' },
  { playerAccountId: 'p3', playerName: 'Mary Shelley', status: 'Approved', investigatorId: 'i3', investigatorName: 'Thomas Kimball', updatedAt: '2026-09-30T10:00:00Z' },
]

function withRows(data: InvestigatorListItem[]) {
  return (Story: () => React.JSX.Element) => (
    <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.investigators(campaignId), data)}>
      <Story />
    </StoryProviders>
  )
}

const meta = {
  title: 'CampaignPlay/InvestigatorList',
  component: InvestigatorList,
  args: { campaignId },
} satisfies Meta<typeof InvestigatorList>

export default meta
type Story = StoryObj<typeof meta>

export const MixedStatuses: Story = { decorators: [withRows(rows)] }

export const Empty: Story = { decorators: [withRows([])] }
