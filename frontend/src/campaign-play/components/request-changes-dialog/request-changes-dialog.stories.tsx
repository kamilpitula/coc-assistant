import type { Meta, StoryObj } from '@storybook/react-vite'

import { RequestChangesDialog } from './request-changes-dialog'

const meta = {
  title: 'CampaignPlay/RequestChangesDialog',
  component: RequestChangesDialog,
  args: { onSend: async () => true },
} satisfies Meta<typeof RequestChangesDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = { args: { pending: false } }

export const Sending: Story = { args: { pending: true } }
