import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, playerCampaign, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { scenarioQueryKeys } from '@/scenario-preparation/services/scenarioApi'
import type { Scenario } from '@/scenario-preparation/types/Scenario'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ScenarioPage } from './scenario-page'

const SCENARIO_ID = 'story-scenario'

const withNotes: Scenario = {
  id: SCENARIO_ID,
  title: 'The Haunting',
  keeperNotes: 'The cellar key is under the stairs.\nCorbitt appears after midnight.',
}

interface StoryArgs {
  role?: 'Keeper' | 'Player'
  scenario?: Scenario
  tokens?: 'pending' | 'failing' | 'granted'
}

function PageStory({ role = 'Keeper', scenario = withNotes, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), role === 'Keeper' ? keeperCampaign : playerCampaign)
          client.setQueryData(scenarioQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID), scenario)
        }}
      >
        <ScenarioPage campaignId={STORY_CAMPAIGN_ID} scenarioId={SCENARIO_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/ScenarioPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const ViewWithNotes: Story = {}

export const ViewWithoutNotes: Story = { args: { scenario: { ...withNotes, keeperNotes: '' } } }

export const Edit: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Edit' }))
  },
}

/** Edit, then Save: the stubbed API accepts the change and the view shows "Scenario saved.". */
export const SavedStatus: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(JSON.stringify({ ...withNotes, title: 'The Haunting II' }), { status: 200 }))
    try {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))
      await userEvent.type(canvas.getByLabelText('Title'), ' II')
      await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
      await canvas.findByText('Scenario saved.')
    } finally {
      window.fetch = original
    }
  },
}

/** A Player gets the same page as an unknown Scenario and no request is made. */
export const NotFound: Story = { args: { role: 'Player' } }
