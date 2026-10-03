import type { Meta, StoryObj } from '@storybook/react-vite'

import { PresenceIndicator } from './presence-indicator'

const meta = {
  title: 'CampaignPlay/PresenceIndicator',
  component: PresenceIndicator,
} satisfies Meta<typeof PresenceIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const Connected: Story = { args: { presence: 'Connected' } }

export const NotConnected: Story = { args: { presence: 'NotConnected' } }

export const Unknown: Story = { args: { presence: 'Unknown' } }
