import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  CampaignLiveConnectionContext,
  type CampaignLiveConnectionValue,
} from '@/campaign-play/providers/campaignLiveConnectionContext'
import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { CampaignPresenceState } from '@/campaign-play/state/campaignPresenceState'
import type { CampaignMember } from '@/campaign-play/types/CampaignMember'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignPresence } from './campaign-presence'

const CAMPAIGN_ID = 'c1'

const roster: CampaignMember[] = [
  { memberId: 'k', displayName: 'Eleanor Hart', role: 'Keeper', isYou: false },
  { memberId: 'y', displayName: 'Sam Okafor', role: 'Player', isYou: true },
  { memberId: 'a', displayName: 'Alex Brandt', role: 'Player', isYou: false },
  { memberId: 'p', displayName: 'Priya Nair', role: 'Player', isYou: false },
  { memberId: 't', displayName: 'Tom Lewis', role: 'Player', isYou: false },
]

const largeRoster: CampaignMember[] = [
  { memberId: 'k', displayName: 'Eleanor Augusta Hartwell-Pemberton of Arkham', role: 'Keeper', isYou: false },
  ...Array.from({ length: 16 }, (_, index) => ({
    memberId: `p${index}`,
    displayName: `Investigator-minded Player Number ${index + 1} With A Rather Long Display Name`,
    role: 'Player' as const,
    isYou: index === 0,
  })),
]

function liveValue(
  connection: CampaignPresenceState['connection'],
  presenceByMember: CampaignPresenceState['presenceByMember'],
): CampaignLiveConnectionValue {
  return { connection, presence: { connection, presenceByMember }, retry: () => {} }
}

interface StoryArgs {
  members: CampaignMember[]
  live: CampaignLiveConnectionValue
}

function PresenceStory({ members, live }: StoryArgs) {
  return (
    <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.members(CAMPAIGN_ID), members)}>
      <CampaignLiveConnectionContext.Provider value={live}>
        <CampaignPresence campaignId={CAMPAIGN_ID} />
      </CampaignLiveConnectionContext.Provider>
    </StoryProviders>
  )
}

const meta = {
  title: 'CampaignPlay/CampaignPresence',
  component: PresenceStory,
} satisfies Meta<typeof PresenceStory>

export default meta
type Story = StoryObj<typeof meta>

export const Live: Story = {
  args: { members: roster, live: liveValue('connected', { k: 'Connected', y: 'Connected', p: 'Connected' }) },
}

export const Connecting: Story = { args: { members: roster, live: liveValue('connecting', null) } }

export const Reconnecting: Story = { args: { members: roster, live: liveValue('reconnecting', null) } }

export const ReconnectFailed: Story = { args: { members: roster, live: liveValue('failed', null) } }

export const KeeperWithNoPlayers: Story = {
  args: {
    members: [{ memberId: 'k', displayName: 'Eleanor Hart', role: 'Keeper', isYou: true }],
    live: liveValue('connected', { k: 'Connected' }),
  },
}

export const SeventeenMembersWithLongNames: Story = {
  args: { members: largeRoster, live: liveValue('connected', { k: 'Connected', p0: 'Connected', p3: 'Connected' }) },
}

export const NarrowWidth: Story = {
  args: Live.args,
  decorators: [
    (StoryComponent) => (
      <div style={{ width: 320 }}>
        <StoryComponent />
      </div>
    ),
  ],
}
