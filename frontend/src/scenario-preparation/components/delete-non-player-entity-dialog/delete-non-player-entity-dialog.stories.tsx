import type { Meta, StoryObj } from '@storybook/react-vite'

import { DeleteNonPlayerEntityDialog } from './delete-non-player-entity-dialog'

const meta = {
  title: 'ScenarioPreparation/DeleteNonPlayerEntityDialog',
  component: DeleteNonPlayerEntityDialog,
  args: {
    open: true,
    name: 'Mr. Knott',
    pending: false,
    failed: false,
    refused: false,
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof DeleteNonPlayerEntityDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}
export const Deleting: Story = { args: { pending: true } }
export const Failure: Story = { args: { failed: true } }
export const Refused: Story = { args: { refused: true } }
