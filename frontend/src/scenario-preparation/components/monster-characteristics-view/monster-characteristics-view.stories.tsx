import type { Meta, StoryObj } from '@storybook/react-vite'

import { dissolvingGhoul, ghoulMythosCreature, overriddenGhoul } from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MonsterCharacteristicsView } from './monster-characteristics-view'

const meta = {
  title: 'ScenarioPreparation/MonsterCharacteristicsView',
  component: MonsterCharacteristicsView,
  args: { characteristics: ghoulMythosCreature.characteristics!, defeatOutcome: ghoulMythosCreature.details.defeatOutcome },
} satisfies Meta<typeof MonsterCharacteristicsView>

export default meta
type Story = StoryObj<typeof meta>

export const Computed: Story = {}
export const OverridesWithoutComputedValues: Story = { args: { characteristics: overriddenGhoul.characteristics! } }
export const HitPointsNotApplicable: Story = {
  args: { characteristics: dissolvingGhoul.characteristics!, defeatOutcome: dissolvingGhoul.details.defeatOutcome },
}
export const OverrideBesideComputed: Story = {
  args: {
    characteristics: {
      ...ghoulMythosCreature.characteristics!,
      overrides: { hitPoints: { value: 40, reason: 'Swollen with stolen life' }, magicPoints: null, damageBonus: null, build: null },
    },
  },
}
