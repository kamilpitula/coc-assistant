import type { Meta, StoryObj } from '@storybook/react-vite'

import { UnlinkItemDialog } from './unlink-item-dialog'

const meta = {
  title: 'ScenarioPreparation/UnlinkItemDialog',
  component: UnlinkItemDialog,
  args: {
    open: true,
    name: "Walter Corbitt's diary",
    pending: false,
    failed: false,
    refused: false,
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof UnlinkItemDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const Unlinking: Story = { args: { pending: true } }

export const Failure: Story = { args: { failed: true } }

export const RefusedBecauseTheSceneIsFinished: Story = { args: { refused: true } }
