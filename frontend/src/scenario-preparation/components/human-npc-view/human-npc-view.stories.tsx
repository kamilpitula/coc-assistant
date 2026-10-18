import type { Meta, StoryObj } from '@storybook/react-vite'

import { gangsterHumanNpc, knottHumanNpc, whateleyHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { HumanNpcView } from './human-npc-view'

const meta = {
  title: 'ScenarioPreparation/HumanNpcView',
  component: HumanNpcView,
  args: { humanNpc: gangsterHumanNpc },
} satisfies Meta<typeof HumanNpcView>

export default meta
type Story = StoryObj<typeof meta>

export const FullProfile: Story = {}
export const NarrativeOnly: Story = { args: { humanNpc: knottHumanNpc } }
export const MovementNotCovered: Story = { args: { humanNpc: whateleyHumanNpc } }
export const Narrow320: Story = { decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>] }
