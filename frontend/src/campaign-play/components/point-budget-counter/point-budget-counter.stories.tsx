import type { Meta, StoryObj } from '@storybook/react-vite'

import { PointBuyBudgetCounter } from './point-budget-counter'

const meta = {
  title: 'CampaignPlay/PointBuyBudgetCounter',
  component: PointBuyBudgetCounter,
} satisfies Meta<typeof PointBuyBudgetCounter>

export default meta
type Story = StoryObj<typeof meta>

export const PartlySpent: Story = {
  args: { values: { STR: 60, CON: 60, DEX: 60, APP: 50, POW: 60, SIZ: 60, INT: 60 }, budget: 460 },
}

export const FullySpent: Story = {
  args: { values: { STR: 60, CON: 60, DEX: 60, APP: 50, POW: 60, SIZ: 60, INT: 60, EDU: 50 }, budget: 460 },
}
