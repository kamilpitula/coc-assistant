import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperRosterAllApproved, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ActiveSceneKeeperView } from './active-scene-keeper-view'

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: 'Arkham, Boston Road',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i-a', name: 'Dr. Ames' }, { id: 'i-c', name: 'Mae Doyle' }],
  reveals: [],
}

const material: Scene = {
  id: 'story-scene',
  title: 'The Corbitt House',
  status: 'Active',
  startedAt: '2026-10-28T19:40:00Z',
  finishedAt: null,
  location: 'Arkham, Boston Road',
  keeperNotes: null,
  nonPlayerEntityLinks: [],
  itemLinks: [],
  handouts: [
    { id: 'h1', kind: 'ReadAloud', visibility: 'PlayerFacing', title: 'The front door' },
    { id: 'h2', kind: 'Text', visibility: 'KeeperFacing', title: "Corbitt's true nature" },
  ],
}

function ViewStory({ withLocation = true, tokens = 'pending' as 'pending' | 'granted' }) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.members(STORY_CAMPAIGN_ID), keeperRosterAllApproved)
          client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, scene.scenarioId, scene.sceneId), material)
        }}
      >
        <ActiveSceneKeeperView
          campaignId={STORY_CAMPAIGN_ID}
          scene={withLocation ? scene : { ...scene, location: '' }}
          headingRef={{ current: null }}
          onFinished={() => undefined}
          onAlreadyFinished={() => undefined}
          onPresentSaved={() => undefined}
          onRevealed={() => undefined}
          onSceneFinished={() => undefined}
          onRefetch={() => undefined}
        />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/ActiveSceneKeeperView',
  component: ViewStory,
} satisfies Meta<typeof ViewStory>

export default meta
type Story = StoryObj<typeof meta>

export const WithLocation: Story = {}

export const WithoutLocation: Story = { args: { withLocation: false } }

export const ChangeMode: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Change' }))
  },
}

export const FinishDialog: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Finish Scene' }))
  },
}

export const SaveErrorEmptySelection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }))
    await userEvent.click(canvas.getByRole('checkbox', { name: /Dr. Ames/ }))
    await userEvent.click(canvas.getByRole('checkbox', { name: /Mae Doyle/ }))
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
  },
}

export const Saving: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
  },
}
