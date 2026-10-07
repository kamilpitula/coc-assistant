import type { Meta, StoryObj } from '@storybook/react-vite'

import { PointsLeftCounter } from './points-left-counter'

const meta = {
  title: 'CampaignPlay/PointsLeftCounter',
  component: PointsLeftCounter,
  args: { label: 'Occupation points', budget: 280 },
} satisfies Meta<typeof PointsLeftCounter>

export default meta
type Story = StoryObj<typeof meta>

export const PointsLeft: Story = { args: { spent: 160 } }

export const OverBudget: Story = { args: { spent: 320 } }
