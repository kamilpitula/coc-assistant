import type { Meta, StoryObj } from '@storybook/react-vite'

import { ValidationErrorSummary } from './validation-error-summary'

const meta = {
  title: 'CampaignPlay/ValidationErrorSummary',
  component: ValidationErrorSummary,
  args: { onSelect: () => {} },
} satisfies Meta<typeof ValidationErrorSummary>

export default meta
type Story = StoryObj<typeof meta>

export const TwoErrors: Story = {
  args: {
    errors: [
      { field: 'identity.name', message: "Enter your Investigator's name." },
      { field: 'identity.age', message: 'Age must be between 15 and 89.' },
    ],
  },
}
