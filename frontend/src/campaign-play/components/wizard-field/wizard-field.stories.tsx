import type { Meta, StoryObj } from '@storybook/react-vite'

import { WizardField } from './wizard-field'

const meta = {
  title: 'CampaignPlay/WizardField',
  component: WizardField,
  args: { onChange: () => {} },
} satisfies Meta<typeof WizardField>

export default meta
type Story = StoryObj<typeof meta>

export const AgeWithHelp: Story = {
  args: {
    field: 'identity.age',
    label: 'Age',
    type: 'number',
    value: 25,
    help: "Age affects your characteristics. You'll see how in a later step.",
  },
}

export const AgeWithError: Story = {
  args: {
    field: 'identity.age',
    label: 'Age',
    type: 'number',
    value: 14,
    error: 'Age must be between 15 and 89.',
  },
}
