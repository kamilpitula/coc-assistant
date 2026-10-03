import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { myCharacterSheet, sheetView } from '@/campaign-play/test-support/characterSheetFixtures'
import {
  keeperCampaign,
  keeperRosterAllApproved,
  keeperRosterWithoutPlayers,
  keeperRosterWithReviews,
  playerCampaign,
  STORY_CAMPAIGN_ID,
} from '@/campaign-play/test-support/rosterFixtures'
import type { CampaignView } from '@/campaign-play/types/Campaign'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import type { InvestigatorSummary, MyCharacterSheet } from '@/campaign-play/types/Investigator'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { AttentionList } from './attention-list'

interface StoryArgs {
  campaign: CampaignView
  members?: CampaignMember[]
  investigator?: InvestigatorSummary | null
  sheet?: MyCharacterSheet
}

function AttentionStory({ campaign, members, investigator, sheet }: StoryArgs) {
  return (
    <StoryMsal>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.members(STORY_CAMPAIGN_ID), members ?? [])
          client.setQueryData(campaignQueryKeys.myInvestigator(STORY_CAMPAIGN_ID), investigator ?? null)
          client.setQueryData(campaignQueryKeys.myCharacterSheet(STORY_CAMPAIGN_ID), sheet ?? null)
        }}
      >
        <AttentionList campaign={campaign} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'CampaignPlay/AttentionList',
  component: AttentionStory,
} satisfies Meta<typeof AttentionStory>

export default meta
type Story = StoryObj<typeof meta>

function summary(overrides: Partial<InvestigatorSummary>): InvestigatorSummary {
  return { id: 'i1', status: 'Draft', name: null, changeRequestComment: null, updatedAt: '2026-10-03T12:00:00Z', ...overrides }
}

export const KeeperWithReviewsPending: Story = { args: { campaign: keeperCampaign, members: keeperRosterWithReviews } }

export const KeeperWithNoPlayers: Story = { args: { campaign: keeperCampaign, members: keeperRosterWithoutPlayers } }

/** Nothing needs the Keeper, so nothing is rendered. */
export const KeeperAllApproved: Story = { args: { campaign: keeperCampaign, members: keeperRosterAllApproved } }

export const PlayerWithoutInvestigator: Story = { args: { campaign: playerCampaign, investigator: null } }

export const PlayerCreationUnavailable: Story = {
  args: { campaign: { ...playerCampaign, allowedCreationMethods: ['StandardRolling'] }, investigator: null },
}

export const PlayerDraft: Story = {
  args: {
    campaign: playerCampaign,
    investigator: summary({ name: 'Mae Doyle' }),
    sheet: myCharacterSheet({ characterSheet: sheetView() }),
  },
}

export const PlayerChangesRequested: Story = {
  args: {
    campaign: playerCampaign,
    investigator: summary({
      status: 'ChangesRequested',
      name: 'Mae Doyle',
      changeRequestComment: 'Please lower the Credit Rating.\nThe Occupation allows 9 to 30.',
    }),
  },
}

/** Submitted or Approved: nothing needs the Player, so nothing is rendered. */
export const PlayerSubmitted: Story = {
  args: { campaign: playerCampaign, investigator: summary({ status: 'Submitted', name: 'Mae Doyle' }) },
}
