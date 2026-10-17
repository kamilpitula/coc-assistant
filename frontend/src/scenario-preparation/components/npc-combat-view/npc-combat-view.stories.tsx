import type { Meta, StoryObj } from '@storybook/react-vite'

import { gangsterHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcCombatView } from './npc-combat-view'

const meta = {
  title: 'ScenarioPreparation/NpcCombatView',
  component: NpcCombatView,
  args: { combat: gangsterHumanNpc.combat!, skills: gangsterHumanNpc.skills! },
} satisfies Meta<typeof NpcCombatView>

export default meta
type Story = StoryObj<typeof meta>

export const WithWeapons: Story = {}
export const Empty: Story = { args: { combat: { dodge: null, dodgeDifficulty: null, armorPoints: null, tacticsAndMorale: null, weapons: [] }, skills: [] } }
export const Narrow320: Story = { decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>] }
