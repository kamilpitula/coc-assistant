import type { Meta, StoryObj } from '@storybook/react-vite'

import { WallEntryTime } from './wall-entry-time'

const now = new Date('2026-10-16T20:00:00Z')

const meta = {
  title: 'CampaignPlay/WallEntryTime',
  component: WallEntryTime,
  args: { now },
} satisfies Meta<typeof WallEntryTime>

export default meta
type Story = StoryObj<typeof meta>

export const Today: Story = { args: { createdAt: '2026-10-16T19:02:00Z' } }

export const EarlierThisYear: Story = { args: { createdAt: '2026-10-03T19:02:00Z' } }

export const AnotherYear: Story = { args: { createdAt: '2025-10-03T19:02:00Z' } }
