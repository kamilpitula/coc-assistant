import type { Meta, StoryObj } from '@storybook/react-vite'

import { DeleteHandoutDialog } from './delete-handout-dialog'

const meta = {
  title: 'ScenarioPreparation/DeleteHandoutDialog',
  component: DeleteHandoutDialog,
  args: {
    open: true,
    handoutTitle: 'The front door',
    pending: false,
    failed: false,
    refused: false,
    refusedMessage: "This Scene has been started, so this Handout can't be deleted.",
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof DeleteHandoutDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const Deleting: Story = { args: { pending: true } }

export const Failure: Story = { args: { failed: true } }

export const Refused: Story = { args: { refused: true } }

export const RefusedForAnItem: Story = {
  args: { refused: true, refusedMessage: "This Item is now part of a Scene that has been played, so this Handout can't be deleted." },
}
