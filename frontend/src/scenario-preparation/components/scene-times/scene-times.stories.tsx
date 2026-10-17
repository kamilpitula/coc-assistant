import type { Meta, StoryObj } from '@storybook/react-vite'

import { SceneTimes } from './scene-times'

const meta = {
  title: 'ScenarioPreparation/SceneTimes',
  component: SceneTimes,
} satisfies Meta<typeof SceneTimes>

export default meta
type Story = StoryObj<typeof meta>

export const None: Story = { args: { startedAt: null, finishedAt: null } }

export const Started: Story = { args: { startedAt: '2026-10-12T19:40:00Z', finishedAt: null } }

export const StartedAndFinished: Story = { args: { startedAt: '2026-10-12T19:40:00Z', finishedAt: '2026-10-12T21:05:00Z' } }
