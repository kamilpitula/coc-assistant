import type { Meta, StoryObj } from '@storybook/react-vite'

import { stateFromHumanNpc, type SectionFieldsProps } from '@/scenario-preparation/services/humanNpcForm'
import { gangsterHumanNpc, knottHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcCombatFields } from './npc-combat-fields'

const noError: SectionFieldsProps['errorOf'] = () => undefined

const meta = {
  title: 'ScenarioPreparation/NpcCombatFields',
  component: NpcCombatFields,
  args: { state: stateFromHumanNpc(gangsterHumanNpc), dispatch: () => undefined, errorOf: noError },
} satisfies Meta<typeof NpcCombatFields>

export default meta
type Story = StoryObj<typeof meta>

export const WithWeapons: Story = {}

export const NoWeaponsAndNoSkills: Story = {
  args: {
    state: stateFromHumanNpc({
      ...knottHumanNpc,
      combat: { dodge: null, dodgeDifficulty: null, armorPoints: null, tacticsAndMorale: null, weapons: [] },
    }),
  },
}

export const DetailsOpenedByServerProblem: Story = {
  args: { errorOf: (path) => (path === 'combat.weapons[1].range' ? 'Range must be 1,000 characters or fewer.' : undefined) },
}

export const Narrow320: Story = { decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>] }
