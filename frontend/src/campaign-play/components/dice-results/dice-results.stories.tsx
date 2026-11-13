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
      { purpose: 'Luck', dice: '3D6', faces: null, result: 11, source: 'PlayerEntered', rolledByDisplayName: 'Ada Lovelace', rolledAt: null, isReplaced: false },
      {
        purpose: 'EduImprovement[1].Check',
        dice: 'D100',
        faces: null,
        result: 70,
        source: 'PlayerEntered',
        rolledByDisplayName: 'Ada Lovelace',
        rolledAt: null,
        isReplaced: false,
      },
      {
        purpose: 'EduImprovement[1].Gain',
        dice: '1D10',
        faces: null,
        result: 5,
        source: 'PlayerEntered',
        rolledByDisplayName: 'Ada Lovelace',
        rolledAt: null,
        isReplaced: false,
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
        isReplaced: false,
      },
      {
        purpose: 'Characteristic:SIZ',
        dice: '2D6',
        faces: [2, 5],
        result: 7,
        source: 'Server',
        rolledByDisplayName: 'Ada Lovelace',
        rolledAt: '2026-11-08T14:30:00+00:00',
        isReplaced: false,
      },
    ],
  },
}

export const NoRolls: Story = { args: { rollRecords: [] } }

export const WithReplaced: Story = {
  args: {
    rollRecords: [
      { purpose: 'Luck', dice: '3D6', faces: [3, 3, 3], result: 9, source: 'Server', rolledByDisplayName: 'Ada Lovelace', rolledAt: '2026-11-08T14:30:00+00:00', isReplaced: false },
      { purpose: 'Luck', dice: '3D6', faces: [4, 4, 3], result: 11, source: 'Server', rolledByDisplayName: 'Ada Lovelace', rolledAt: '2026-11-07T14:30:00+00:00', isReplaced: true },
    ],
  },
}
