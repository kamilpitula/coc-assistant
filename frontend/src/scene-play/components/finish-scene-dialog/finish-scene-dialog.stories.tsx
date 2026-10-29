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
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof FinishSceneDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const Finishing: Story = { args: { pending: true } }

export const Failure: Story = { args: { failed: true } }
