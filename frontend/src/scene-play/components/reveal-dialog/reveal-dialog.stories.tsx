import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { RevealDialog } from './reveal-dialog'

const investigators = [
  { id: 'i1', name: 'Harvey Walters' },
  { id: 'i2', name: 'Lucy Ward' },
]

const meta = {
  title: 'ScenePlay/RevealDialog',
  component: RevealDialog,
  args: {
    open: true,
    title: 'The front door',
    summary: 'Read-aloud \u00b7 Player-facing',
    investigators,
    alreadyRevealedIds: new Set<string>(),
    pending: false,
    refusal: null,
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof RevealDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AlreadyRevealed: Story = { args: { alreadyRevealedIds: new Set(['i2']) } }

export const NoneChecked: Story = {
  args: { alreadyRevealedIds: new Set(['i1', 'i2']) },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement.ownerDocument.body).getByRole('button', { name: 'Reveal' }))
  },
}

export const Busy: Story = { args: { pending: true } }

export const SceneFinished: Story = { args: { refusal: { message: 'This Scene has been finished, so nothing more can be revealed.' } } }

export const SubjectRefused: Story = { args: { refusal: { message: "This can't be revealed any more. It may have been changed or removed." } } }

export const InvestigatorsRefused: Story = {
  args: { refusal: { message: 'One of these Investigators is no longer present. Check the list and try again.' } },
}

export const OtherFailure: Story = { args: { refusal: { message: "We couldn't reveal The front door. Try again." } } }
