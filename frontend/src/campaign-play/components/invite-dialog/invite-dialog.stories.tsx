import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { CampaignInvite } from '@/campaign-play/types/CampaignInvite'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { InvitePlayersDialog } from './invite-dialog'

const CAMPAIGN_ID = 'story-campaign'

const activeInvite: CampaignInvite = { campaignId: CAMPAIGN_ID, token: 'abc123', status: 'Active' }

/** Choose "Invite Players" to open the dialog in each state (specs/campaign-overview/ux.md section 6). */
function DialogStory({ invite, tokens }: { invite: CampaignInvite | null; tokens: 'pending' | 'failing' }) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.invite(CAMPAIGN_ID), invite)}>
        <InvitePlayersDialog campaignId={CAMPAIGN_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'CampaignPlay/InvitePlayersDialog',
  component: DialogStory,
} satisfies Meta<typeof DialogStory>

export default meta
type Story = StoryObj<typeof meta>

export const ActiveInvite: Story = { args: { invite: activeInvite, tokens: 'pending' } }

/** No active Invite: opening issues one, and the issue request never settles here. */
export const Issuing: Story = { args: { invite: null, tokens: 'pending' } }

/** No active Invite and issuing fails. */
export const IssueFailed: Story = { args: { invite: null, tokens: 'failing' } }
