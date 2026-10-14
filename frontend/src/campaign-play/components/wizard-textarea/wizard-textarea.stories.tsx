import type { Meta, StoryObj } from '@storybook/react-vite'

import { WizardTextarea } from './wizard-textarea'

const meta = {
  title: 'CampaignPlay/WizardTextarea',
  component: WizardTextarea,
  args: { onChange: () => {}, maxLength: 2000 },
} satisfies Meta<typeof WizardTextarea>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { field: 'backstory.traits', label: 'Traits', value: null } }

export const Filled: Story = {
  args: { field: 'backstory.significantPeople', label: 'Significant people', value: 'My sister Ada, who taught me to read.\nProfessor Armitage.' },
}

export const WithError: Story = { args: { field: 'gear', label: 'Gear and possessions', value: 'Lantern', error: 'Enter at most 2000 characters.' } }
