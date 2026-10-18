import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CreateNonPlayerEntityPage } from './create-non-player-entity-page'

function PageStory({ tokens = 'pending' }: { tokens?: 'pending' | 'failing' | 'granted' }) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)}>
        <CreateNonPlayerEntityPage campaignId={STORY_CAMPAIGN_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/CreateNonPlayerEntityPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const NoTypeChosen: Story = {}

export const HumanNpcWithAge: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('radio', { name: 'Human NPC' }))
  },
}

export const EveryFieldError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('radio', { name: 'Human NPC' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }))
  },
}

export const Failure: Story = {
  args: { tokens: 'failing' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('radio', { name: 'Human NPC' }))
    await userEvent.type(canvas.getByLabelText('Name'), 'Mr. Knott')
    await userEvent.type(canvas.getByLabelText('Age'), '62')
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }))
  },
}
