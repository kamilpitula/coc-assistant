import type { Meta, StoryObj } from '@storybook/react-vite'

import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterDefensesView } from './monster-defenses-view'

const meta = {
  title: 'ScenarioPreparation/MonsterDefensesView',
  component: MonsterDefensesView,
  args: { defenses: ghoulMythosCreature.defenses! },
} satisfies Meta<typeof MonsterDefensesView>

export default meta
type Story = StoryObj<typeof meta>

export const WithEntries: Story = {}
export const Empty: Story = { args: { defenses: { armorPoints: null, armorNote: null, immunities: [], vulnerabilities: [] } } }
