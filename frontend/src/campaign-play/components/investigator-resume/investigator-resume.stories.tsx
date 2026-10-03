import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { InvestigatorResume } from './investigator-resume'

const campaignId = 'story-campaign'

const meta = {
  title: 'CampaignPlay/InvestigatorResume',
  component: InvestigatorResume,
  args: { campaignId },
} satisfies Meta<typeof InvestigatorResume>

export default meta
type Story = StoryObj<typeof meta>

/** With no Investigator the resume route shows the not-found page; otherwise it redirects to a wizard step. */
export const NoInvestigator: Story = {
  decorators: [
    (Story) => (
      <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.myCharacterSheet(campaignId), null)}>
        <Story />
      </StoryProviders>
    ),
  ],
}
