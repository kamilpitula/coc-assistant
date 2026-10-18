import type { Meta, StoryObj } from '@storybook/react-vite'

import { stateFromMythosCreature, type SectionFieldsProps } from '@/scenario-preparation/services/mythosCreatureForm'
import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterMovementRows } from './monster-movement-rows'

const noErrors: SectionFieldsProps['errorOf'] = () => undefined

const meta = {
  title: 'ScenarioPreparation/MonsterMovementRows',
  component: MonsterMovementRows,
  args: { state: stateFromMythosCreature(ghoulMythosCreature), dispatch: () => undefined, errorOf: noErrors },
} satisfies Meta<typeof MonsterMovementRows>

export default meta
type Story = StoryObj<typeof meta>

export const WalkAndOther: Story = {}
export const NoModes: Story = { args: { state: stateFromMythosCreature({ ...ghoulMythosCreature, movement: [] }) } }
export const WithProblems: Story = {
  args: { errorOf: (path) => ({ 'movement[1].label': 'Name the mode.', 'movement[0].rate': 'Enter a rate from 0 to 999.' })[path] },
}
