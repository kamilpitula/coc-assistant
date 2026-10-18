import type { Meta, StoryObj } from '@storybook/react-vite'

import { stateFromMythosCreature, type SectionFieldsProps } from '@/scenario-preparation/services/mythosCreatureForm'
import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterSkillRows } from './monster-skill-rows'

const noErrors: SectionFieldsProps['errorOf'] = () => undefined

const meta = {
  title: 'ScenarioPreparation/MonsterSkillRows',
  component: MonsterSkillRows,
  args: {
    state: stateFromMythosCreature(ghoulMythosCreature),
    dispatch: () => undefined,
    errorOf: noErrors,
    skillCatalog: undefined,
    catalogFailed: false,
    onRetryCatalog: () => undefined,
  },
} satisfies Meta<typeof MonsterSkillRows>

export default meta
type Story = StoryObj<typeof meta>

export const OneRow: Story = {}
export const NoRows: Story = { args: { state: stateFromMythosCreature({ ...ghoulMythosCreature, skills: [] }) } }
export const CatalogFailed: Story = { args: { catalogFailed: true } }
export const HundredRows: Story = {
  args: {
    state: stateFromMythosCreature({
      ...ghoulMythosCreature,
      skills: Array.from({ length: 100 }, (_, index) => ({ name: `Skill ${index + 1}`, value: 10, difficulty: 'Regular' as const })),
    }),
  },
}
