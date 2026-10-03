import type { Meta, StoryObj } from '@storybook/react-vite'

import { StartOverDialog } from './start-over-dialog'

const meta = {
  title: 'CampaignPlay/StartOverDialog',
  component: StartOverDialog,
  args: { onConfirm: () => {} },
} satisfies Meta<typeof StartOverDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = { args: { pending: false } }

export const Deleting: Story = { args: { pending: true } }
