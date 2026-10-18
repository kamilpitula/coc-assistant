import type { Meta, StoryObj } from '@storybook/react-vite'

import { gangsterHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcSpellsView } from './npc-spells-view'

const meta = {
  title: 'ScenarioPreparation/NpcSpellsView',
  component: NpcSpellsView,
  args: { spells: gangsterHumanNpc.spells! },
} satisfies Meta<typeof NpcSpellsView>

export default meta
type Story = StoryObj<typeof meta>

export const WithSpell: Story = {}
export const Empty: Story = { args: { spells: [] } }
