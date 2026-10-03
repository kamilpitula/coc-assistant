import type { Meta, StoryObj } from '@storybook/react-vite'

import { emptyInputs, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { IdentityStep } from './identity-step'

const meta = {
  title: 'CampaignPlay/IdentityStep',
  component: IdentityStep,
  args: { playerName: 'Ada Lovelace', errors: {}, onAction: () => {}, onBlur: () => {} },
} satisfies Meta<typeof IdentityStep>

export default meta
type Story = StoryObj<typeof meta>

export const Filled: Story = { args: { inputs: validInputs } }

export const Empty: Story = { args: { inputs: emptyInputs } }

export const WithErrors: Story = {
  args: {
    inputs: { ...emptyInputs, identity: { ...emptyInputs.identity, age: 14 } },
    errors: { 'identity.name': "Enter your Investigator's name.", 'identity.age': 'Age must be between 15 and 89.' },
  },
}
