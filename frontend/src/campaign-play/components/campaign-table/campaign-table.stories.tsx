import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  CampaignLiveConnectionContext,
  type CampaignLiveConnectionValue,
} from '@/campaign-play/providers/campaignLiveConnectionContext'
import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { CampaignPresenceState } from '@/campaign-play/state/campaignPresenceState'
import {
  keeperRosterWithoutPlayers,
  keeperRosterWithReviews,
  largeRoster,
  playerRoster,
  STORY_CAMPAIGN_ID,
} from '@/campaign-play/test-support/rosterFixtures'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignTable } from './campaign-table'

function liveValue(
  connection: CampaignPresenceState['connection'],
  presenceByMember: CampaignPresenceState['presenceByMember'],
): CampaignLiveConnectionValue {
  return { connection, presence: { connection, presenceByMember }, retry: () => {} }
}

function TableStory({ members, live }: { members: CampaignMember[]; live: CampaignLiveConnectionValue }) {
  return (
    <StoryMsal>
      <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.members(STORY_CAMPAIGN_ID), members)}>
        <CampaignLiveConnectionContext.Provider value={live}>
          <CampaignTable campaignId={STORY_CAMPAIGN_ID} />
        </CampaignLiveConnectionContext.Provider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'CampaignPlay/CampaignTable',
  component: TableStory,
} satisfies Meta<typeof TableStory>

export default meta
type Story = StoryObj<typeof meta>

const connected = liveValue('connected', { k: 'Connected', a: 'Connected', c: 'Connected', y: 'Connected' })

export const KeeperWithReviewsPending: Story = { args: { members: keeperRosterWithReviews, live: connected } }

export const KeeperWithNoPlayers: Story = { args: { members: keeperRosterWithoutPlayers, live: connected } }

export const PlayerView: Story = { args: { members: playerRoster, live: connected } }

export const Connecting: Story = { args: { members: playerRoster, live: liveValue('connecting', null) } }

export const Reconnecting: Story = { args: { members: playerRoster, live: liveValue('reconnecting', null) } }

export const ReconnectFailed: Story = { args: { members: playerRoster, live: liveValue('failed', null) } }

export const SeventeenMembersWithLongNames: Story = { args: { members: largeRoster, live: connected } }

export const NarrowWidth: Story = {
  args: { members: keeperRosterWithReviews, live: connected },
  decorators: [
    (StoryComponent) => (
      <div style={{ width: 320 }}>
        <StoryComponent />
      </div>
    ),
  ],
}
