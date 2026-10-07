import type { Meta, StoryObj } from '@storybook/react-vite'

import { occupationCatalog, rules, sheetView, skill, skillCatalog, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { PersonalInterestsStep } from './personal-interests-step'

const meta = {
  title: 'CampaignPlay/PersonalInterestsStep',
  component: PersonalInterestsStep,
  args: {
    inputs: validInputs,
    errors: {},
    rules,
    sheet: sheetView(),
    occupationCatalog,
    skillCatalog,
    onAction: () => {},
    onBlur: () => {},
  },
} satisfies Meta<typeof PersonalInterestsStep>

export default meta
type Story = StoryObj<typeof meta>

export const PointMethods: Story = {}

export const QuickFire: Story = {
  args: {
    inputs: {
      ...validInputs,
      creationMethod: 'QuickFire',
      skills: [],
      quickFire: { values: [{ ...skill('Credit Rating'), value: 30 }, { ...skill('Appraise'), value: 70 }], personalInterests: [skill('Listen')] },
    },
  },
}
