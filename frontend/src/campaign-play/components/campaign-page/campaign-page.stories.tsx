import type { Meta, StoryObj } from '@storybook/react-vite'

import { CampaignLiveConnectionContext } from '@/campaign-play/providers/campaignLiveConnectionContext'
import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { myCharacterSheet, sheetView } from '@/campaign-play/test-support/characterSheetFixtures'
import {
  keeperCampaign,
  keeperRosterAllApproved,
  keeperRosterWithoutPlayers,
  keeperRosterWithReviews,
  playerCampaign,
  playerRoster,
  STORY_CAMPAIGN_ID,
} from '@/campaign-play/test-support/rosterFixtures'
import type { CampaignView } from '@/campaign-play/types/Campaign'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import type { InvestigatorSummary } from '@/campaign-play/types/Investigator'
import { scenarioQueryKeys } from '@/scenario-preparation/services/scenarioApi'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignPage } from './campaign-page'

const live = {
  connection: 'connected',
  presence: { connection: 'connected', presenceByMember: { k: 'Connected', a: 'Connected', y: 'Connected' } },
  retry: () => {},
} as const

interface StoryArgs {
  campaign: CampaignView
  members: CampaignMember[]
  investigator?: InvestigatorSummary | null
}

function OverviewStory({ campaign, members, investigator = null }: StoryArgs) {
  return (
    <StoryMsal>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), campaign)
          client.setQueryData(campaignQueryKeys.members(STORY_CAMPAIGN_ID), members)
          client.setQueryData(scenarioQueryKeys.list(STORY_CAMPAIGN_ID), [
            { id: 's1', title: 'The Haunting', keeperNotes: '' },
            { id: 's2', title: 'Edge of Darkness', keeperNotes: '' },
          ])
          client.setQueryData(campaignQueryKeys.myInvestigator(STORY_CAMPAIGN_ID), investigator)
          client.setQueryData(campaignQueryKeys.myCharacterSheet(STORY_CAMPAIGN_ID), myCharacterSheet({ characterSheet: sheetView() }))
        }}
      >
        <CampaignLiveConnectionContext.Provider value={live}>
          <CampaignPage campaignId={STORY_CAMPAIGN_ID} />
        </CampaignLiveConnectionContext.Provider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'CampaignPlay/CampaignPage',
  component: OverviewStory,
} satisfies Meta<typeof OverviewStory>

export default meta
type Story = StoryObj<typeof meta>

export const KeeperWithReviewsPending: Story = { args: { campaign: keeperCampaign, members: keeperRosterWithReviews } }

export const KeeperWithNoPlayers: Story = { args: { campaign: keeperCampaign, members: keeperRosterWithoutPlayers } }

export const KeeperAllApproved: Story = { args: { campaign: keeperCampaign, members: keeperRosterAllApproved } }

export const PlayerWithDraft: Story = {
  args: {
    campaign: playerCampaign,
    members: playerRoster,
    investigator: { id: 'i1', status: 'Draft', name: null, changeRequestComment: null, updatedAt: '2026-10-03T12:00:00Z' },
  },
}

/** A Player whose Investigator is Submitted has no attention items. */
export const PlayerWithNothingToDo: Story = {
  args: {
    campaign: playerCampaign,
    members: playerRoster,
    investigator: { id: 'i1', status: 'Submitted', name: 'Mae Doyle', changeRequestComment: null, updatedAt: '2026-10-03T12:00:00Z' },
  },
}
