import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, keeperRosterAllApproved, keeperRosterWithoutPlayers, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { scenarioQueryKeys } from '@/scenario-preparation/services/scenarioApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { activeSceneQueryKeys } from '@/scene-play/services/activeSceneApi'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { StartScenePage } from './start-scene-page'

const SCENARIO_ID = 'story-scenario'
const SCENE_ID = 'story-scene'

const prepared: Scene = {
  id: SCENE_ID,
  title: 'The Corbitt House',
  location: 'Arkham, Boston Road',
  keeperNotes: null,
  status: 'Prepared',
  startedAt: null,
  finishedAt: null,
  nonPlayerEntityLinks: [],
  itemLinks: [],
  handouts: [],
}

const otherActive: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-other',
  scenarioId: SCENARIO_ID,
  scenarioTitle: 'The Haunting',
  title: 'Meeting Knott',
  location: '',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i-c', name: 'Mae Doyle' }],
  reveals: [],
}

interface StoryArgs {
  scene?: Scene
  active?: KeeperActiveScene | null
  roster?: typeof keeperRosterAllApproved
  tokens?: 'pending' | 'failing' | 'granted'
  loading?: boolean
}

function PageStory({ scene = prepared, active = null, roster = keeperRosterAllApproved, tokens = 'pending', loading = false }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)
          if (loading) {
            return
          }
          client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID, SCENE_ID), scene)
          client.setQueryData(scenarioQueryKeys.detail(STORY_CAMPAIGN_ID, SCENARIO_ID), { id: SCENARIO_ID, title: 'The Haunting', keeperNotes: '' })
          client.setQueryData(campaignQueryKeys.members(STORY_CAMPAIGN_ID), roster)
          client.setQueryData(activeSceneQueryKeys.detail(STORY_CAMPAIGN_ID), active)
        }}
      >
        <StartScenePage campaignId={STORY_CAMPAIGN_ID} scenarioId={SCENARIO_ID} sceneId={SCENE_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/StartScenePage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const WithActiveScene: Story = { args: { active: otherActive } }

export const NoApprovedInvestigator: Story = { args: { roster: keeperRosterWithoutPlayers } }

export const EmptySelectionError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const checkbox of canvas.getAllByRole('checkbox')) {
      await userEvent.click(checkbox)
    }
    await userEvent.click(canvas.getByRole('button', { name: 'Start Scene' }))
  },
}

export const FinishChoiceError: Story = {
  args: { active: otherActive },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Start Scene' }))
  },
}

export const Starting: Story = {
  args: { tokens: 'pending' },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Start Scene' }))
  },
}

/** The start is refused with 409 because the Scene was started elsewhere. */
export const RefusedAlreadyStarted: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(JSON.stringify({ title: 'Only a Prepared Scene can be started.' }), { status: 409 }))
    try {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByRole('button', { name: 'Start Scene' }))
      await canvas.findByRole('alert')
    } finally {
      window.fetch = original
    }
  },
}

/** The start is refused with 409 because another Scene became Active meanwhile. */
export const RefusedAnotherSceneActive: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(JSON.stringify({ title: 'Another Scene is Active.' }), { status: 409 }))
    try {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByRole('button', { name: 'Start Scene' }))
      await canvas.findByRole('alert')
    } finally {
      window.fetch = original
    }
  },
}

export const RefusedInvestigators: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(JSON.stringify({ errors: { presentInvestigatorIds: ['x'] } }), { status: 400 }))
    try {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByRole('button', { name: 'Start Scene' }))
      await canvas.findByRole('alert')
    } finally {
      window.fetch = original
    }
  },
}

export const AlreadyStarted: Story = { args: { scene: { ...prepared, status: 'Active', startedAt: '2026-10-28T19:40:00Z' } } }

export const Loading: Story = { args: { loading: true } }
