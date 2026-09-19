import type { Meta, StoryObj } from '@storybook/react-vite'

import { HomePage } from '@/shared/components/HomePage'

const meta = {
  title: 'Shared/HomePage',
  component: HomePage,
} satisfies Meta<typeof HomePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
