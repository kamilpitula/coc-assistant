import type { Meta, StoryObj } from '@storybook/react-vite'

import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterMovementView } from './monster-movement-view'

const meta = {
  title: 'ScenarioPreparation/MonsterMovementView',
  component: MonsterMovementView,
  args: { movement: ghoulMythosCreature.movement! },
} satisfies Meta<typeof MonsterMovementView>

export default meta
type Story = StoryObj<typeof meta>

export const Modes: Story = {}
export const NoOrdinaryMovement: Story = { args: { movement: [] } }
