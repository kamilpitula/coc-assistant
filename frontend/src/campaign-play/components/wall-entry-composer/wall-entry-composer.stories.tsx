import type { Meta, StoryObj } from '@storybook/react-vite'

import { WallEntryComposer } from './wall-entry-composer'

const meta = {
  title: 'CampaignPlay/WallEntryComposer',
  component: WallEntryComposer,
  args: { viewerRole: 'Keeper', pending: false, failed: false, onSubmit: async () => true },
} satisfies Meta<typeof WallEntryComposer>

export default meta
type Story = StoryObj<typeof meta>

export const Keeper: Story = {}

export const Player: Story = { args: { viewerRole: 'Player' } }

export const Adding: Story = { args: { pending: true } }

export const PostFailed: Story = { args: { failed: true } }
