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
      { purpose: 'Luck', dice: '3D6', faces: null, result: 11, source: 'PlayerEntered', rolledByDisplayName: 'Ada Lovelace', rolledAt: null },
      {
        purpose: 'EduImprovement[1].Check',
        dice: 'D100',
        faces: null,
        result: 70,
        source: 'PlayerEntered',
        rolledByDisplayName: 'Ada Lovelace',
        rolledAt: null,
      },
      {
        purpose: 'EduImprovement[1].Gain',
        dice: '1D10',
        faces: null,
        result: 5,
        source: 'PlayerEntered',
        rolledByDisplayName: 'Ada Lovelace',
        rolledAt: null,
      },
    ],
  },
}

export const ServerRolledCharacteristics: Story = {
  args: {
    rollRecords: [
      {
        purpose: 'Characteristic:STR',
        dice: '3D6',
        faces: [2, 5, 6],
        result: 13,
        source: 'Server',
        rolledByDisplayName: 'Ada Lovelace',
        rolledAt: '2026-11-08T14:30:00+00:00',
      },
      {
        purpose: 'Characteristic:SIZ',
        dice: '2D6',
        faces: [2, 5],
        result: 7,
        source: 'Server',
        rolledByDisplayName: 'Ada Lovelace',
        rolledAt: '2026-11-08T14:30:00+00:00',
      },
    ],
  },
}

export const NoRolls: Story = { args: { rollRecords: [] } }
