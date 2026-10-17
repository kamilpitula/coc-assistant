import type { Meta, StoryObj } from '@storybook/react-vite'

import { SceneStatusBadge } from './scene-status-badge'

const meta = {
  title: 'ScenarioPreparation/SceneStatusBadge',
  component: SceneStatusBadge,
} satisfies Meta<typeof SceneStatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Prepared: Story = { args: { status: 'Prepared' } }

export const Active: Story = { args: { status: 'Active' } }

export const Finished: Story = { args: { status: 'Finished' } }
