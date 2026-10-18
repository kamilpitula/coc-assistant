import type { Meta, StoryObj } from '@storybook/react-vite'

import { gangsterHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { SpellsView } from './spells-view'

const meta = {
  title: 'ScenarioPreparation/SpellsView',
  component: SpellsView,
  args: { spells: gangsterHumanNpc.spells! },
} satisfies Meta<typeof SpellsView>

export default meta
type Story = StoryObj<typeof meta>

export const WithSpell: Story = {}
export const Empty: Story = { args: { spells: [] } }
