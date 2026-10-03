import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  bracket17,
  bracket25,
  emptyInputs,
  problem,
  rules,
  validInputs,
} from '@/campaign-play/test-support/characterSheetFixtures'

import { CharacteristicsStep } from './characteristics-step'

const meta = {
  title: 'CampaignPlay/CharacteristicsStep',
  component: CharacteristicsStep,
  args: { rules, errors: {}, warnings: [], onAction: () => {}, onBlur: () => {} },
} satisfies Meta<typeof CharacteristicsStep>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { inputs: emptyInputs, bracket: bracket25 } }

export const Complete: Story = { args: { inputs: validInputs, bracket: bracket25 } }

export const YoungInvestigatorRollsLuckTwice: Story = {
  args: { inputs: { ...validInputs, luckRolls: [11, 13] }, bracket: bracket17 },
}

export const WithWarningAndTotalError: Story = {
  args: {
    inputs: { ...validInputs, characteristics: { ...validInputs.characteristics, INT: 35 } },
    bracket: bracket25,
    errors: { characteristics: 'Your characteristics must add up to 460. They add up to 435.' },
    warnings: [
      problem('PointBuyBelowRecommendation', 'characteristics.INT', 'INT is below the recommended 40. Check with your Keeper.', 'Warning'),
    ],
  },
}
