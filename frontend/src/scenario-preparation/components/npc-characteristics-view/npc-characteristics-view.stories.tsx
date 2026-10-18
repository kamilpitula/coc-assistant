import type { Meta, StoryObj } from '@storybook/react-vite'

import { thugHumanNpc, whateleyHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcCharacteristicsView } from './npc-characteristics-view'

const meta = {
  title: 'ScenarioPreparation/NpcCharacteristicsView',
  component: NpcCharacteristicsView,
  args: { characteristics: thugHumanNpc.characteristics! },
} satisfies Meta<typeof NpcCharacteristicsView>

export default meta
type Story = StoryObj<typeof meta>

export const Thug: Story = {}
export const MovementNotCovered: Story = { args: { characteristics: whateleyHumanNpc.characteristics! } }
export const NothingWorkedOut: Story = {
  args: {
    characteristics: {
      values: { APP: 60 },
      difficulty: { APP: 'Hard' },
      derived: { hitPoints: null, magicPoints: null, damageBonus: null, build: null, movementRate: null, movementRateNotCovered: false },
    },
  },
}
export const Narrow320: Story = { decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>] }
