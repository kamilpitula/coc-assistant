import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperRosterAllApproved, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { InvestigatorsPresentSection } from './investigators-present-section'

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: 'Arkham',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i-a', name: 'Dr. Ames' }],
  reveals: [],
}

function SectionStory({ tokens = 'pending' as 'pending' | 'granted' }) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.members(STORY_CAMPAIGN_ID), keeperRosterAllApproved)}>
        <InvestigatorsPresentSection campaignId={STORY_CAMPAIGN_ID} scene={scene} onSaved={() => undefined} onFinishedMeanwhile={() => undefined} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/InvestigatorsPresentSection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const View: Story = {}

export const ChangeMode: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Change' }))
  },
}

export const EmptySelectionError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }))
    await userEvent.click(canvas.getByRole('checkbox', { name: /Dr. Ames/ }))
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

/** The save is answered with 409 because the Scene was finished meanwhile. */
export const SceneFinishedMeanwhile: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(JSON.stringify({ title: 'No Scene is Active.' }), { status: 409 }))
    try {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByRole('button', { name: 'Change' }))
      await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
      await canvas.findByRole('alert')
    } finally {
      window.fetch = original
    }
  },
}

export const SaveFailed: Story = {
  args: { tokens: 'granted' },
  play: async ({ canvasElement }) => {
    const original = window.fetch
    window.fetch = () => Promise.resolve(new Response(null, { status: 500 }))
    try {
      const canvas = within(canvasElement)
      await userEvent.click(canvas.getByRole('button', { name: 'Change' }))
      await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
      await canvas.findByRole('alert')
    } finally {
      window.fetch = original
    }
  },
}
