import type { Meta, StoryObj } from '@storybook/react-vite'

import { bracket25, bracket45, rules, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { AgeEffectsStep } from './age-effects-step'

const meta = {
  title: 'CampaignPlay/AgeEffectsStep',
  component: AgeEffectsStep,
  args: { rules, errors: {}, onAction: () => {}, onBlur: () => {} },
} satisfies Meta<typeof AgeEffectsStep>

export default meta
type Story = StoryObj<typeof meta>

export const Age25: Story = { args: { inputs: validInputs, bracket: bracket25 } }

export const Age45WithAGain: Story = {
  args: {
    inputs: {
      ...validInputs,
      identity: { ...validInputs.identity, age: 45 },
      ageEffects: { deductions: { STR: 3 }, eduImprovementChecks: [{ check: 70, gain: 5 }, { check: null, gain: null }] },
    },
    bracket: bracket45,
    errors: { 'ageEffects.deductions': 'Deduct exactly 5 points in total. You have deducted 3.' },
  },
}

export const NoValidAgeYet: Story = { args: { inputs: validInputs, bracket: null } }
