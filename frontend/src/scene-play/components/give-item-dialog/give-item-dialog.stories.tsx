import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { GiveItemDialog } from './give-item-dialog'

const itemName = "Walter Corbitt's diary"

const investigators = [
  { id: 'i1', name: 'Harvey Walters' },
  { id: 'i2', name: 'Lucy Ward' },
]

const meta = {
  title: 'ScenePlay/GiveItemDialog',
  component: GiveItemDialog,
  args: {
    open: true,
    itemName,
    holder: null,
    investigators,
    pending: false,
    refusal: null,
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof GiveItemDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const HeldBySomeoneElse: Story = { args: { holder: { id: 'i1', name: 'Harvey Walters' } } }

export const NoneChosen: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement.ownerDocument.body).getByRole('button', { name: 'Give' }))
  },
}

export const Busy: Story = { args: { pending: true } }

export const ChangedMeanwhile: Story = { args: { refusal: `${itemName} wasn't given: the Scene or the Item changed meanwhile.` } }

export const ItemRefused: Story = { args: { refusal: `${itemName} is no longer part of this Scene.` } }

export const InvestigatorRefused: Story = {
  args: { refusal: `That Investigator is no longer present or already holds ${itemName}. Check the list and try again.` },
}

export const NotFound: Story = { args: { refusal: `We couldn't find ${itemName}. It may have been deleted.` } }

export const OtherFailure: Story = { args: { refusal: `We couldn't give ${itemName}. Try again.` } }
