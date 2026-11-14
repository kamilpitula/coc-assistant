import type { Meta, StoryObj } from '@storybook/react-vite'

import { FinishSceneDialog } from './finish-scene-dialog'

const meta = {
  title: 'ScenePlay/FinishSceneDialog',
  component: FinishSceneDialog,
  args: {
    open: true,
    sceneTitle: 'The Corbitt House',
    pending: false,
    failed: false,
    waitingRollCount: 0,
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof FinishSceneDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = { args: { waitingRollCount: 0 } }

export const Finishing: Story = { args: { pending: true } }

export const Failure: Story = { args: { failed: true } }

export const CancelsTwoWaitingRolls: Story = { args: { waitingRollCount: 2 } }

export const CancelsOneWaitingRoll: Story = { args: { waitingRollCount: 1 } }

export const UnknownCount: Story = { args: { waitingRollCount: undefined } }
