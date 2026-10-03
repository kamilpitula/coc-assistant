import type { Meta, StoryObj } from '@storybook/react-vite'

import { FieldGroupError } from './field-group-error'

const meta = {
  title: 'CampaignPlay/FieldGroupError',
  component: FieldGroupError,
} satisfies Meta<typeof FieldGroupError>

export default meta
type Story = StoryObj<typeof meta>

export const TotalMismatch: Story = {
  args: { field: 'characteristics', error: 'Your characteristics must add up to 460. They add up to 450.' },
}
