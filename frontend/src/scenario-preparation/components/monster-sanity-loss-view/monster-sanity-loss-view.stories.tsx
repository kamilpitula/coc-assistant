import type { Meta, StoryObj } from '@storybook/react-vite'

import { MonsterSanityLossView } from './monster-sanity-loss-view'

const meta = {
  title: 'ScenarioPreparation/MonsterSanityLossView',
  component: MonsterSanityLossView,
  args: { sanityLoss: { value: '0/1D6' } },
} satisfies Meta<typeof MonsterSanityLossView>

export default meta
type Story = StoryObj<typeof meta>

export const WithSanityLoss: Story = {}
export const NoSanityRoll: Story = { args: { sanityLoss: { value: null } } }
