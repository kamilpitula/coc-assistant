import type { Meta, StoryObj } from '@storybook/react-vite'

import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterSkillsView } from './monster-skills-view'

const meta = {
  title: 'ScenarioPreparation/MonsterSkillsView',
  component: MonsterSkillsView,
  args: { skills: ghoulMythosCreature.skills! },
} satisfies Meta<typeof MonsterSkillsView>

export default meta
type Story = StoryObj<typeof meta>

export const WithSkills: Story = {}
export const Empty: Story = { args: { skills: [] } }
