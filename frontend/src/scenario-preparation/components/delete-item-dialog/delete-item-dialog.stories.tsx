import type { Meta, StoryObj } from '@storybook/react-vite'

import { DeleteItemDialog } from './delete-item-dialog'

const meta = {
  title: 'ScenarioPreparation/DeleteItemDialog',
  component: DeleteItemDialog,
  args: {
    open: true,
    name: "Walter Corbitt's diary",
    pending: false,
    failed: false,
    refusedBecause: null,
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof DeleteItemDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const Deleting: Story = { args: { pending: true } }

export const Failure: Story = { args: { failed: true } }

export const RefusedBecauseOfAPlayedScene: Story = { args: { refusedBecause: 'played' } }

export const RefusedBecauseHeld: Story = { args: { refusedBecause: 'held' } }
