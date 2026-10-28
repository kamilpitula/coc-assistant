import type { Meta, StoryObj } from '@storybook/react-vite'

import { STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { NoActiveScene } from './no-active-scene'

const meta = {
  title: 'ScenePlay/NoActiveScene',
  component: NoActiveScene,
  args: { campaignId: STORY_CAMPAIGN_ID, isKeeper: false },
  decorators: [(StoryComponent) => <StoryProviders><StoryComponent /></StoryProviders>],
} satisfies Meta<typeof NoActiveScene>

export default meta
type Story = StoryObj<typeof meta>

export const Player: Story = {}

export const Keeper: Story = { args: { isKeeper: true } }
