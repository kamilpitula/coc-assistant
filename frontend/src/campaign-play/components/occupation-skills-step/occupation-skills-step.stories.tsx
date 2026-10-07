import type { Meta, StoryObj } from '@storybook/react-vite'

import { occupationCatalog, rules, sheetView, skill, skillCatalog, validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { OccupationSkillsStep } from './occupation-skills-step'

const meta = {
  title: 'CampaignPlay/OccupationSkillsStep',
  component: OccupationSkillsStep,
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
} satisfies Meta<typeof OccupationSkillsStep>

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
