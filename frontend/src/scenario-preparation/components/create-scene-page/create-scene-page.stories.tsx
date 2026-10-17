import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { scenarioQueryKeys } from '@/scenario-preparation/services/scenarioApi'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CreateScenePage } from './create-scene-page'

const SCENARIO_ID = 'story-scenario'

function PageStory({ tokens = 'pending' }: { tokens?: 'pending' | 'failing' }) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)
          client.setQueryData(scenarioQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID), {
            id: SCENARIO_ID,
            title: 'The Haunting',
            keeperNotes: '',
          })
        }}
      >
        <CreateScenePage campaignId={STORY_CAMPAIGN_ID} scenarioId={SCENARIO_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/CreateScenePage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

/** The token never arrives, so the request stays in flight and the button reads "Creating...". */
export const Creating: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Title'), 'The Corbitt House')
    await userEvent.click(canvas.getByRole('button', { name: 'Create Scene' }))
  },
}

/** The request fails and the typed input is kept. */
export const Failure: Story = {
  args: { tokens: 'failing' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Title'), 'The Corbitt House')
    await userEvent.click(canvas.getByRole('button', { name: 'Create Scene' }))
  },
}
