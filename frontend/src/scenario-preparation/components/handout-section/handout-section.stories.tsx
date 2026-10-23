import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { HandoutSection } from './handout-section'

const door: HandoutSummary = { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' }
const truth: HandoutSummary = { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: "Corbitt's true nature" }
const cellar: HandoutSummary = { id: 'h3', kind: 'ReadAloud', visibility: 'KeeperFacing', title: 'The cellar' }
const clipping: HandoutSummary = { id: 'h4', kind: 'Text', visibility: 'PlayerFacing', title: 'A newspaper clipping' }
const longTitle: HandoutSummary = {
  id: 'h5',
  kind: 'ReadAloud',
  visibility: 'PlayerFacing',
  title: 'The extraordinarily long and winding description of the abandoned Miskatonic Valley cannery cellar and everything in it',
}

interface StoryArgs {
  handouts: HandoutSummary[]
  canChange?: boolean
  tokens?: 'pending' | 'failing' | 'granted'
  width?: number
}

function SectionStory({ handouts, canChange = true, tokens = 'pending', width }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders>
        <div style={width ? { width } : undefined}>
          <HandoutSection
            owner={{ type: 'scene', campaignId: 'story-campaign', scenarioId: 'story-scenario', sceneId: 'story-scene' }}
            canChange={canChange}
            handouts={handouts}
            ownerUpdatedAt={1}
          />
        </div>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/HandoutSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { handouts: [] } }

/** Both kinds and both visibilities. */
export const SeveralHandouts: Story = { args: { handouts: [door, truth, cellar, clipping] } }

export const Finished: Story = { args: { handouts: [door, truth], canChange: false } }

/** A long title wraps and the controls stay on its row at 320px. */
export const LongTitleAt320px: Story = { args: { handouts: [door, longTitle], width: 320 } }

/** The token never arrives, so the move stays in flight and every move button is aria-disabled. */
export const ReorderSaving: Story = {
  args: { handouts: [door, truth, cellar] },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: "Move Corbitt's true nature up" }))
  },
}

/** The request fails, so the saved order stays and the alert shows. */
export const ReorderFailure: Story = {
  args: { handouts: [door, truth, cellar], tokens: 'failing' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: "Move Corbitt's true nature up" }))
  },
}

/** The server answers 409 to the move, and the stale alert shows. */
export const ReorderStale: Story = {
  args: { handouts: [door, truth, cellar], tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(null, { status: 409 }))
    try {
      await userEvent.click(within(canvasElement).getByRole('button', { name: "Move Corbitt's true nature up" }))
      await within(canvasElement).findByRole('alert')
    } finally {
      window.fetch = original
    }
  },
}
