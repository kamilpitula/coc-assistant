import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { emptySheetView, myCharacterSheet } from '@/campaign-play/test-support/characterSheetFixtures'
import type { PlayerCampaign } from '@/campaign-play/types/Campaign'
import type { InvestigatorSummary } from '@/campaign-play/types/Investigator'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { YourInvestigatorCard } from './your-investigator-card'

const campaign: PlayerCampaign = {
  id: 'story-campaign',
  name: 'The Haunting',
  era: '1920s',
  allowedCreationMethods: ['StandardRolling', 'PointBuy', 'QuickFire'],
  role: 'Player',
}

function summary(overrides: Partial<InvestigatorSummary>): InvestigatorSummary {
  return { id: 'i1', status: 'Draft', name: 'Harvey Walters', changeRequestComment: null, updatedAt: '2026-10-02T12:00:00Z', ...overrides }
}

function withInvestigator(investigator: InvestigatorSummary | null) {
  return (Story: () => React.JSX.Element) => (
    <StoryProviders
      seed={(client) => {
        client.setQueryData(campaignQueryKeys.myInvestigator(campaign.id), investigator)
        client.setQueryData(campaignQueryKeys.myCharacterSheet(campaign.id), myCharacterSheet({ characterSheet: emptySheetView() }))
      }}
    >
      <Story />
    </StoryProviders>
  )
}

const meta = {
  title: 'CampaignPlay/YourInvestigatorCard',
  component: YourInvestigatorCard,
  args: { campaign },
} satisfies Meta<typeof YourInvestigatorCard>

export default meta
type Story = StoryObj<typeof meta>

export const NoInvestigator: Story = { decorators: [withInvestigator(null)] }

export const CreationMethodsNotAvailable: Story = {
  args: { campaign: { ...campaign, allowedCreationMethods: ['StandardRolling', 'QuickFire'] } },
  decorators: [withInvestigator(null)],
}

export const Draft: Story = { decorators: [withInvestigator(summary({ name: null }))] }

export const Submitted: Story = { decorators: [withInvestigator(summary({ status: 'Submitted' }))] }

export const ChangesRequested: Story = {
  decorators: [
    withInvestigator(summary({ status: 'ChangesRequested', changeRequestComment: 'Credit Rating seems high for this Occupation' })),
  ],
}

export const Approved: Story = { decorators: [withInvestigator(summary({ status: 'Approved' }))] }
