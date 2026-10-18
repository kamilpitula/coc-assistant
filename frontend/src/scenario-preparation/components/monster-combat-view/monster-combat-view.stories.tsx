import type { Meta, StoryObj } from '@storybook/react-vite'

import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterCombatView } from './monster-combat-view'

const meta = {
  title: 'ScenarioPreparation/MonsterCombatView',
  component: MonsterCombatView,
  args: { combat: ghoulMythosCreature.combat! },
} satisfies Meta<typeof MonsterCombatView>

export default meta
type Story = StoryObj<typeof meta>

export const WithAttacks: Story = {}
export const Empty: Story = { args: { combat: { attacksPerRound: null, dodge: null, dodgeDifficulty: null, attacks: [] } } }
