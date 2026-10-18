import type { Meta, StoryObj } from '@storybook/react-vite'

import { stateFromMythosCreature, type SectionFieldsProps } from '@/scenario-preparation/services/mythosCreatureForm'
import { ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterSanityLossFields } from './monster-sanity-loss-fields'

const noErrors: SectionFieldsProps['errorOf'] = () => undefined

const meta = {
  title: 'ScenarioPreparation/MonsterSanityLossFields',
  component: MonsterSanityLossFields,
  args: { state: stateFromMythosCreature(ghoulMythosCreature), dispatch: () => undefined, errorOf: noErrors },
} satisfies Meta<typeof MonsterSanityLossFields>

export default meta
type Story = StoryObj<typeof meta>

export const Filled: Story = {}
export const WithProblem: Story = {
  args: { errorOf: () => 'Write the Sanity loss as success/failure, for example 0/1D6.' },
}
