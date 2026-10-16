import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { scenarioQueryKeys } from '@/scenario-preparation/services/scenarioApi'
import type { Scenario } from '@/scenario-preparation/types/Scenario'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ScenarioListSection } from './scenario-list-section'

const CAMPAIGN_ID = 'story-campaign'

const haunting: Scenario = { id: 's1', title: 'The Haunting', keeperNotes: '' }
const edge: Scenario = { id: 's2', title: 'Edge of Darkness', keeperNotes: '' }
const masks: Scenario = { id: 's3', title: 'Masks of Nyarlathotep', keeperNotes: '' }
const longTitle: Scenario = {
  id: 's4',
  title: 'The Extraordinarily Long and Winding Investigation of the Abandoned Miskatonic Valley Cannery',
  keeperNotes: '',
}

interface StoryArgs {
  scenarios?: Scenario[]
  tokens?: 'pending' | 'failing' | 'granted'
  width?: number
}

function SectionStory({ scenarios, tokens = 'pending', width }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          if (scenarios) {
            client.setQueryData(scenarioQueryKeys.list(CAMPAIGN_ID), scenarios)
          }
        }}
      >
        <div style={width ? { width } : undefined}>
          <ScenarioListSection campaignId={CAMPAIGN_ID} />
        </div>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/ScenarioListSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { scenarios: [] } }

export const TwoScenarios: Story = { args: { scenarios: [haunting, edge] } }

export const ThreeScenarios: Story = { args: { scenarios: [haunting, edge, masks] } }

/** One Scenario has no move controls. */
export const SingleScenario: Story = { args: { scenarios: [haunting] } }

/** A long title wraps and the controls stay on its line at 320px. */
export const LongTitleAt320px: Story = { args: { scenarios: [haunting, longTitle], width: 320 } }

/** The token never arrives, so the list never loads. */
export const Loading: Story = { args: {} }

export const LoadError: Story = { args: { tokens: 'failing' } }

/** The move is in flight: the token never arrives, so every move button stays aria-disabled. */
export const ReorderSaving: Story = {
  args: { scenarios: [haunting, edge, masks] },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Move Edge of Darkness up' }))
  },
}

/** The request fails, so the saved order stays and the alert shows. */
export const ReorderFailure: Story = {
  args: { scenarios: [haunting, edge, masks], tokens: 'failing' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Move Edge of Darkness up' }))
  },
}

/** The server answers 409 to the move, the list is refetched, and the stale alert shows. */
export const ReorderStale: Story = {
  args: { scenarios: [haunting, edge, masks], tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = (_input, init) =>
      Promise.resolve(
        init?.method === 'PUT'
          ? new Response(null, { status: 409 })
          : new Response(JSON.stringify({ scenarios: [haunting, masks] }), { status: 200 }),
      )
    try {
      await userEvent.click(within(canvasElement).getByRole('button', { name: 'Move Edge of Darkness up' }))
      await within(canvasElement).findByRole('alert')
    } finally {
      window.fetch = original
    }
  },
}
