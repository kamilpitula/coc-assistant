import type { Meta, StoryObj } from '@storybook/react-vite'

import { stateFromMythosCreature, type SectionFieldsProps } from '@/scenario-preparation/services/mythosCreatureForm'
import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterDefensesFields } from './monster-defenses-fields'

const noErrors: SectionFieldsProps['errorOf'] = () => undefined

const meta = {
  title: 'ScenarioPreparation/MonsterDefensesFields',
  component: MonsterDefensesFields,
  args: { state: stateFromMythosCreature(ghoulMythosCreature), dispatch: () => undefined, errorOf: noErrors },
} satisfies Meta<typeof MonsterDefensesFields>

export default meta
type Story = StoryObj<typeof meta>

export const WithEntries: Story = {}
export const Empty: Story = {
  args: { state: stateFromMythosCreature({ ...ghoulMythosCreature, defenses: { armorPoints: null, armorNote: null, immunities: [], vulnerabilities: [] } }) },
}
export const WithProblems: Story = {
  args: { errorOf: (path) => ({ 'defenses.armorPoints': 'Enter armor points from 0 to 2,000.', 'defenses.immunities[0].description': 'Describe the immunity.' })[path] },
}
