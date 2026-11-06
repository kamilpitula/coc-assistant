import type { Meta, StoryObj } from '@storybook/react-vite'

import { TakeBackItemDialog } from './take-back-item-dialog'

const itemName = "Walter Corbitt's diary"

const meta = {
  title: 'ScenePlay/TakeBackItemDialog',
  component: TakeBackItemDialog,
  args: {
    open: true,
    itemName,
    holderName: 'Harvey Walters',
    pending: false,
    refusal: null,
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof TakeBackItemDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Busy: Story = { args: { pending: true } }

export const Failure: Story = { args: { refusal: `We couldn't take ${itemName} back. Try again.` } }
