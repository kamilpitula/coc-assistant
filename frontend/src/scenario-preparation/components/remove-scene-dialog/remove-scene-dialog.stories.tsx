import type { Meta, StoryObj } from '@storybook/react-vite'

import { RemoveSceneDialog } from './remove-scene-dialog'

const meta = {
  title: 'ScenarioPreparation/RemoveSceneDialog',
  component: RemoveSceneDialog,
  args: {
    open: true,
    sceneTitle: 'Meeting Knott',
    pending: false,
    failed: false,
    refused: false,
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof RemoveSceneDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const Removing: Story = { args: { pending: true } }

export const Failure: Story = { args: { failed: true } }

export const Refused: Story = { args: { refused: true } }
