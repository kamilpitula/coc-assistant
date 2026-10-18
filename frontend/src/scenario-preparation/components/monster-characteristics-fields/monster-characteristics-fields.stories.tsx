import type { Meta, StoryObj } from '@storybook/react-vite'

import { stateFromMythosCreature, type SectionFieldsProps } from '@/scenario-preparation/services/mythosCreatureForm'
import { dissolvingGhoul, ghoulMythosCreature, overriddenGhoul } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterCharacteristicsFields } from './monster-characteristics-fields'

const noErrors: SectionFieldsProps['errorOf'] = () => undefined

const meta = {
  title: 'ScenarioPreparation/MonsterCharacteristicsFields',
  component: MonsterCharacteristicsFields,
  args: { state: stateFromMythosCreature(ghoulMythosCreature), dispatch: () => undefined, errorOf: noErrors },
} satisfies Meta<typeof MonsterCharacteristicsFields>

export default meta
type Story = StoryObj<typeof meta>

export const Computed: Story = {}
export const EveryOverride: Story = { args: { state: stateFromMythosCreature(overriddenGhoul) } }
export const HitPointsNotApplicable: Story = { args: { state: stateFromMythosCreature(dissolvingGhoul) } }
export const WithProblems: Story = {
  args: {
    state: stateFromMythosCreature(overriddenGhoul),
    errorOf: (path) =>
      ({
        'characteristics.values.STR': 'Enter STR from 0 to 2,000.',
        'characteristics.overrides.hitPoints.reason': 'Give a reason for the override.',
      })[path],
  },
}
