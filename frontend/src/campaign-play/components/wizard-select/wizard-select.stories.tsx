import type { Meta, StoryObj } from '@storybook/react-vite'

import { WizardSelect } from './wizard-select'

const meta = {
  title: 'CampaignPlay/WizardSelect',
  component: WizardSelect,
  args: {
    field: 'characteristics.STR',
    label: 'STR',
    options: ['80', '70', '60'].map((value) => ({ value, label: value })),
    onChange: () => {},
  },
} satisfies Meta<typeof WizardSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { value: null } }

export const Chosen: Story = { args: { value: '70' } }

export const WithError: Story = { args: { value: '45', error: 'STR must be one of the Quick fire values: 40, 50, 60, 70, 80.' } }
