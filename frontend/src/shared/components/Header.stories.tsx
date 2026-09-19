import type { Meta, StoryObj } from '@storybook/react-vite'

import { Header } from '@/shared/components/Header'

const meta = {
  title: 'Shared/Header',
  component: Header,
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
