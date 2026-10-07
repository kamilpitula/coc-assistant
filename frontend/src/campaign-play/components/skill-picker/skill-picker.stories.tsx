import type { Meta, StoryObj } from '@storybook/react-vite'

import { skill, skillCatalog } from '@/campaign-play/test-support/characterSheetFixtures'

import { SkillPicker } from './skill-picker'

const meta = {
  title: 'CampaignPlay/SkillPicker',
  component: SkillPicker,
  args: { field: 'occupation.custom.skills[0]', label: 'Occupation skill 1', skillCatalog, onChange: () => {} },
} satisfies Meta<typeof SkillPicker>

export default meta
type Story = StoryObj<typeof meta>

export const AnySkill: Story = { args: { value: null } }

export const ClosedFamily: Story = { args: { value: skill('Firearms') } }

export const OpenFamilySpecializationOnly: Story = {
  args: { label: 'Art/Craft specialization', value: skill('Art/Craft'), options: [skill('Art/Craft')], specializationOnly: true },
}
