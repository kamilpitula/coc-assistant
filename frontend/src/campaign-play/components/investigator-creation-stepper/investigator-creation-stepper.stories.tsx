import type { Meta, StoryObj } from '@storybook/react-vite'

import { InvestigatorCreationStepper } from './investigator-creation-stepper'

const meta = {
  title: 'CampaignPlay/InvestigatorCreationStepper',
  component: InvestigatorCreationStepper,
  args: { campaignId: 'story-campaign', onSelect: () => {} },
} satisfies Meta<typeof InvestigatorCreationStepper>

export default meta
type Story = StoryObj<typeof meta>

export const OnCharacteristics: Story = {
  args: {
    current: 'characteristics',
    states: { identity: 'completed', characteristics: 'notStarted', age: 'notStarted', sheet: 'notStarted' },
  },
}

export const EarlierStepNeedsAttention: Story = {
  args: {
    current: 'age',
    states: { identity: 'completed', characteristics: 'needsAttention', age: 'notStarted', sheet: 'notStarted' },
  },
}
