import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { SceneSummary } from '@/scenario-preparation/types/Scene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SceneListSection } from './scene-list-section'

const CAMPAIGN_ID = 'story-campaign'
const SCENARIO_ID = 'story-scenario'

const knott: SceneSummary = { id: 'a1', title: 'Meeting Knott', status: 'Prepared', startedAt: null, finishedAt: null }
const corbitt: SceneSummary = {
  id: 'a2',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: '2026-10-12T19:40:00Z',
  finishedAt: null,
}
const cellar: SceneSummary = {
  id: 'a3',
  title: 'The Cellar',
  status: 'Finished',
  startedAt: '2026-10-12T19:40:00Z',
  finishedAt: '2026-10-12T21:05:00Z',
}
const longTitle: SceneSummary = {
  id: 'a4',
  title: 'The Extraordinarily Long and Winding Descent into the Abandoned Miskatonic Valley Cannery Cellar',
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
}

interface StoryArgs {
  scenes?: SceneSummary[]
  tokens?: 'pending' | 'failing' | 'granted'
  width?: number
}

function SectionStory({ scenes, tokens = 'pending', width }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          if (scenes) {
            client.setQueryData(sceneQueryKeys.list(CAMPAIGN_ID, SCENARIO_ID), scenes)
          }
        }}
      >
        <div style={width ? { width } : undefined}>
          <SceneListSection campaignId={CAMPAIGN_ID} scenarioId={SCENARIO_ID} />
        </div>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/SceneListSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { scenes: [] } }

/** One Scene has no move controls. */
export const SingleScene: Story = { args: { scenes: [knott] } }

/** Every status; times only once set. */
export const ThreeScenesWithEveryStatus: Story = { args: { scenes: [knott, corbitt, cellar] } }

/** A long title wraps and the controls stay on its row at 320px. */
export const LongTitleAt320px: Story = { args: { scenes: [knott, longTitle], width: 320 } }

/** The token never arrives, so the list never loads. */
export const Loading: Story = { args: {} }

export const LoadError: Story = { args: { tokens: 'failing' } }

/** The move is in flight: the token never arrives, so every move button stays aria-disabled. */
export const ReorderSaving: Story = {
  args: { scenes: [knott, corbitt, cellar] },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Move The Corbitt House up' }))
  },
}

/** The request fails, so the saved order stays and the alert shows. */
export const ReorderFailure: Story = {
  args: { scenes: [knott, corbitt, cellar], tokens: 'failing' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Move The Corbitt House up' }))
  },
}

/** The server answers 409 to the move, the list is refetched, and the stale alert shows. */
export const ReorderStale: Story = {
  args: { scenes: [knott, corbitt, cellar], tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = (_input, init) =>
      Promise.resolve(
        init?.method === 'PUT'
          ? new Response(null, { status: 409 })
          : new Response(JSON.stringify({ scenes: [knott, cellar] }), { status: 200 }),
      )
    try {
      await userEvent.click(within(canvasElement).getByRole('button', { name: 'Move The Corbitt House up' }))
      await within(canvasElement).findByRole('alert')
    } finally {
      window.fetch = original
    }
  },
}
