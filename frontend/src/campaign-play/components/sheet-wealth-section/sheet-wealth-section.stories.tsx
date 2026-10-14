import type { Meta, StoryObj } from '@storybook/react-vite'

import { SheetWealthSection } from './sheet-wealth-section'

const meta = {
  title: 'CampaignPlay/SheetWealthSection',
  component: SheetWealthSection,
} satisfies Meta<typeof SheetWealthSection>

export default meta
type Story = StoryObj<typeof meta>

export const Computed: Story = {
  args: { wealth: { currency: 'USD', spendingLevel: { amount: 10, orMore: false }, cash: { amount: 60, orMore: false }, assets: { amount: 1500, orMore: false } } },
}

export const LowerBoundAssets: Story = {
  args: { wealth: { currency: 'USD', spendingLevel: { amount: 5000, orMore: false }, cash: { amount: 50000, orMore: false }, assets: { amount: 5000000, orMore: true } } },
}

export const NotYetCalculated: Story = { args: { wealth: null } }
