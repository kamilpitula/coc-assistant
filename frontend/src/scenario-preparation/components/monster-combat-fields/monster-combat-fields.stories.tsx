import type { Meta, StoryObj } from '@storybook/react-vite'

import { stateFromMythosCreature, type SectionFieldsProps } from '@/scenario-preparation/services/mythosCreatureForm'
import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterCombatFields } from './monster-combat-fields'

const noErrors: SectionFieldsProps['errorOf'] = () => undefined

const meta = {
  title: 'ScenarioPreparation/MonsterCombatFields',
  component: MonsterCombatFields,
  args: { state: stateFromMythosCreature(ghoulMythosCreature), dispatch: () => undefined, errorOf: noErrors },
} satisfies Meta<typeof MonsterCombatFields>

export default meta
type Story = StoryObj<typeof meta>

export const WithAttacks: Story = {}
export const NoAttacks: Story = {
  args: { state: stateFromMythosCreature({ ...ghoulMythosCreature, combat: { attacksPerRound: null, dodge: null, dodgeDifficulty: null, attacks: [] } }) },
}
export const WithProblems: Story = {
  args: {
    errorOf: (path) =>
      ({
        'combat.attacks[0].damage': 'Write the damage as dice and numbers, for example 1D6+DB or 2D6-1.',
        'combat.attacks[0].effect': 'Effect must be 1,000 characters or fewer.',
      })[path],
  },
}
