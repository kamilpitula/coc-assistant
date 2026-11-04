import type { Meta, StoryObj } from '@storybook/react-vite'

import { LiveBadge } from './live-badge'

const meta = {
  title: 'Shared/LiveBadge',
  component: LiveBadge,
} satisfies Meta<typeof LiveBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
