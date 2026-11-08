import type { Meta, StoryObj } from '@storybook/react-vite'

import { CreationMethodChoice } from './creation-method-choice'

const meta = {
  title: 'CampaignPlay/CreationMethodChoice',
  component: CreationMethodChoice,
  args: { allowed: ['StandardRolling', 'PointBuy', 'QuickFire'], value: 'PointBuy', needsConfirmation: false, clearsSkills: () => false, onChange: () => {} },
} satisfies Meta<typeof CreationMethodChoice>

export default meta
type Story = StoryObj<typeof meta>

export const Choice: Story = {}

export const AsksBeforeClearing: Story = { args: { needsConfirmation: true } }

export const OnlyOneMethod: Story = { args: { allowed: ['PointBuy'] } }

export const Locked: Story = { args: { allowed: ['StandardRolling', 'PointBuy', 'QuickFire'], value: 'StandardRolling', locked: true } }

export const LockedDraft: Story = {
  args: { allowed: ['StandardRolling', 'PointBuy', 'QuickFire'], value: 'StandardRolling', locked: true, canStartOver: true },
}
