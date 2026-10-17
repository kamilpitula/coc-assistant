import type { Meta, StoryObj } from '@storybook/react-vite'

import { gangsterHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'

import { NpcSkillsView } from './npc-skills-view'

const meta = {
  title: 'ScenarioPreparation/NpcSkillsView',
  component: NpcSkillsView,
  args: { skills: gangsterHumanNpc.skills! },
} satisfies Meta<typeof NpcSkillsView>

export default meta
type Story = StoryObj<typeof meta>

export const WithSkills: Story = {}
export const Empty: Story = { args: { skills: [] } }
export const Narrow320: Story = { decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>] }
