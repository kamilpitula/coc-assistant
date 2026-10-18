import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  bareMythosCreature,
  dissolvingGhoul,
  ghoulMythosCreature,
  narrativeGhoul,
  overriddenGhoul,
} from '@/scenario-preparation/test-support/mythosCreatureFixtures'

import { MythosCreatureView } from './mythos-creature-view'

const meta = {
  title: 'ScenarioPreparation/MythosCreatureView',
  component: MythosCreatureView,
  args: { mythosCreature: ghoulMythosCreature },
} satisfies Meta<typeof MythosCreatureView>

export default meta
type Story = StoryObj<typeof meta>

export const FullProfile: Story = {}
export const NarrativeOnly: Story = { args: { mythosCreature: narrativeGhoul } }
export const NameOnly: Story = { args: { mythosCreature: bareMythosCreature } }
export const EveryOverrideState: Story = { args: { mythosCreature: overriddenGhoul } }
export const HitPointsNotApplicable: Story = { args: { mythosCreature: dissolvingGhoul } }
export const At320px: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
}
