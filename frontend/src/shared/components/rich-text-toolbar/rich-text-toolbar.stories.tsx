import type { Meta, StoryObj } from '@storybook/react-vite'

import { EMPTY_TOOLBAR_STATE } from '@/shared/services/richTextToolbar'

import { RichTextToolbar } from './rich-text-toolbar'

const meta = {
  title: 'Shared/RichTextToolbar',
  component: RichTextToolbar,
  args: { state: EMPTY_TOOLBAR_STATE, onAction: () => undefined },
} satisfies Meta<typeof RichTextToolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Nothing: Story = {}

export const BoldInAHeading: Story = { args: { state: { ...EMPTY_TOOLBAR_STATE, bold: true, heading: true } } }

export const InALink: Story = { args: { state: { ...EMPTY_TOOLBAR_STATE, link: true, 'bulleted-list': true } } }

/** At 320px the toolbar wraps. */
export const Narrow: Story = {
  render: (args) => (
    <div style={{ width: 320 }}>
      <RichTextToolbar {...args} />
    </div>
  ),
}
