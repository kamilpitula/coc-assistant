import type { Meta, StoryObj } from '@storybook/react-vite'

import { DiceResults } from './dice-results'

const meta = {
  title: 'CampaignPlay/DiceResults',
  component: DiceResults,
} satisfies Meta<typeof DiceResults>

export default meta
type Story = StoryObj<typeof meta>

export const LuckAndEduChecks: Story = {
  args: {
    rollRecords: [
      { purpose: 'Luck', dice: '3D6', result: 11, source: 'PlayerEntered' },
      { purpose: 'EduImprovement[1].Check', dice: 'D100', result: 70, source: 'PlayerEntered' },
      { purpose: 'EduImprovement[1].Gain', dice: '1D10', result: 5, source: 'PlayerEntered' },
    ],
  },
}

export const NoRolls: Story = { args: { rollRecords: [] } }
