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
  args: { rules, errors: {}, warnings: [], allowedMethods: ['PointBuy'], onAction: () => {}, onBlur: () => {} },
} satisfies Meta<typeof CharacteristicsStep>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { inputs: emptyInputs, bracket: bracket25 } }

export const Complete: Story = { args: { inputs: validInputs, bracket: bracket25 } }

export const YoungInvestigatorRollsLuckTwice: Story = {
  args: { inputs: { ...validInputs, luckRolls: [11, 13] }, bracket: bracket17 },
}

export const ChoosingAMethod: Story = {
  args: { inputs: { ...emptyInputs, creationMethod: null }, bracket: bracket25, allowedMethods: ['StandardRolling', 'PointBuy', 'QuickFire'] },
}

export const StandardRolling: Story = {
  args: {
    inputs: { ...emptyInputs, creationMethod: 'StandardRolling', characteristicRolls: { STR: 12, SIZ: 7 } },
    bracket: bracket25,
    allowedMethods: ['StandardRolling', 'PointBuy', 'QuickFire'],
  },
}

export const QuickFire: Story = {
  args: {
    inputs: { ...emptyInputs, creationMethod: 'QuickFire', characteristics: { STR: 80, CON: 50 } },
    bracket: bracket25,
    allowedMethods: ['StandardRolling', 'PointBuy', 'QuickFire'],
  },
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
