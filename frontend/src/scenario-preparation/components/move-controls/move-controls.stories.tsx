import type { Meta, StoryObj } from '@storybook/react-vite'

import { MoveControls } from './move-controls'

const meta = {
  title: 'ScenarioPreparation/MoveControls',
  component: MoveControls,
  args: {
    itemId: 'a1',
    title: 'The Corbitt House',
    isFirst: false,
    isLast: false,
    saving: false,
    buttonIdPrefix: 'scene',
    onMove: () => undefined,
  },
} satisfies Meta<typeof MoveControls>

export default meta
type Story = StoryObj<typeof meta>

export const Middle: Story = {}

export const First: Story = { args: { isFirst: true } }

export const Last: Story = { args: { isLast: true } }

export const Saving: Story = { args: { saving: true } }
