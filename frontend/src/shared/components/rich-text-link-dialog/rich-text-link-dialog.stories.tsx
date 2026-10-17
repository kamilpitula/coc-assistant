import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { RichTextLinkDialog } from './rich-text-link-dialog'

const meta = {
  title: 'Shared/RichTextLinkDialog',
  component: RichTextLinkDialog,
  args: {
    open: true,
    editingUrl: null,
    onSave: () => undefined,
    onRemove: () => undefined,
    onClose: () => undefined,
    onCloseFocus: () => undefined,
  },
} satisfies Meta<typeof RichTextLinkDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Add: Story = {}

export const Edit: Story = { args: { editingUrl: 'https://example.com/corbitt' } }

/** An address that is not http or https is refused with a message under the field. */
export const InvalidAddress: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.type(await body.findByRole('textbox', { name: 'Web address' }), 'javascript:alert(1)')
    await userEvent.click(await body.findByRole('button', { name: 'Save link' }))
  },
}
