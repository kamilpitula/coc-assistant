import type { Meta, StoryObj } from '@storybook/react-vite'

import { RevealTrigger } from './reveal-trigger'

const meta = {
  title: 'ScenePlay/RevealTrigger',
  component: RevealTrigger,
  args: { triggerId: 'reveal-trigger-h1', title: 'The front door', onReveal: () => undefined },
} satisfies Meta<typeof RevealTrigger>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
