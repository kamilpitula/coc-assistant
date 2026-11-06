import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { MaterialLoadState } from './material-load-state'

const meta = {
  title: 'ScenePlay/MaterialLoadState',
  component: MaterialLoadState,
} satisfies Meta<typeof MaterialLoadState>

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = { args: { isError: false, onRetry: fn() } }

export const Failed: Story = { args: { isError: true, onRetry: fn() } }
