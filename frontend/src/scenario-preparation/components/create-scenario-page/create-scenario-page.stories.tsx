import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CreateScenarioPage } from './create-scenario-page'

function PageStory({ tokens = 'pending' }: { tokens?: 'pending' | 'failing' }) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)}>
        <CreateScenarioPage campaignId={STORY_CAMPAIGN_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/CreateScenarioPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

/** The token never arrives, so the request stays in flight and the button reads "Creating...". */
export const Creating: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Title'), 'The Haunting')
    await userEvent.click(canvas.getByRole('button', { name: 'Create Scenario' }))
  },
}

/** The request fails and the typed input is kept. */
export const Failure: Story = {
  args: { tokens: 'failing' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Title'), 'The Haunting')
    await userEvent.click(canvas.getByRole('button', { name: 'Create Scenario' }))
  },
}
