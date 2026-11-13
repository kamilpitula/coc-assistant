import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  bracket17,
  bracket25,
  emptyInputs,
  emptySheetView,
  problem,
  rules,
  sheetView,
  validInputs,
} from '@/campaign-play/test-support/characterSheetFixtures'
import { CHARACTERISTIC_CODES, type CharacterSheetView } from '@/campaign-play/types/CharacterSheet'

import { CharacteristicsStep } from './characteristics-step'

const meta = {
  title: 'CampaignPlay/CharacteristicsStep',
  component: CharacteristicsStep,
  args: {
    rules,
    errors: {},
    warnings: [],
    allowedMethods: ['PointBuy'],
    sheet: sheetView(),
    status: 'Draft',
    roll: { status: { state: 'idle', group: null }, onRoll: () => {}, onRetry: () => {} },
    luckRoll: { status: { state: 'idle', group: null }, onRoll: () => {}, onRetry: () => {} },
    onAction: () => {},
    onBlur: () => {},
  },
} satisfies Meta<typeof CharacteristicsStep>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { inputs: emptyInputs, bracket: bracket25 } }

export const Complete: Story = { args: { inputs: validInputs, bracket: bracket25 } }

export const YoungInvestigatorRollsLuckTwice: Story = {
  args: { inputs: validInputs, bracket: bracket17, sheet: sheetView({ luckRolls: [11, 13] }) },
}

export const LuckToRoll: Story = {
  args: { inputs: validInputs, bracket: bracket25, sheet: sheetView({ luckRolls: [] }) },
}

export const PointBuyEduLocked: Story = {
  args: {
    inputs: validInputs,
    bracket: bracket25,
    sheet: sheetView({ locks: { creationMethod: false, ageBracket: false, edu: true } }),
  },
}

export const ChoosingAMethod: Story = {
  args: { inputs: { ...emptyInputs, creationMethod: null }, bracket: bracket25, allowedMethods: ['StandardRolling', 'PointBuy', 'QuickFire'] },
}

export const StandardRolling: Story = {
  args: {
    inputs: { ...emptyInputs, creationMethod: 'StandardRolling' },
    bracket: bracket25,
    allowedMethods: ['StandardRolling', 'PointBuy', 'QuickFire'],
    sheet: { ...emptySheetView(), creationMethod: 'StandardRolling' },
  },
}

const legacySheet: CharacterSheetView = {
  ...sheetView({
    creationMethod: 'StandardRolling',
    characteristicRolls: { STR: 11 },
    rollRecords: [
      {
        purpose: 'Characteristic:STR',
        dice: '3D6',
        faces: null,
        result: 11,
        source: 'PlayerEntered',
        rolledByDisplayName: 'Ada Lovelace',
        rolledAt: null,
        isReplaced: false,
      },
    ],
  }),
  characteristics: Object.fromEntries(
    CHARACTERISTIC_CODES.map((code) => [
      code,
      code === 'STR'
        ? { assigned: 55, value: 55, hard: 27, extreme: 11 }
        : { assigned: null, value: null, hard: null, extreme: null },
    ]),
  ) as CharacterSheetView['characteristics'],
}

export const StandardRollingLegacyPartial: Story = {
  args: {
    inputs: { ...emptyInputs, creationMethod: 'StandardRolling', characteristics: { STR: 55 } },
    bracket: bracket25,
    allowedMethods: ['StandardRolling'],
    sheet: legacySheet,
  },
}

export const StandardRollingRolled: Story = {
  args: {
    inputs: { ...emptyInputs, creationMethod: 'StandardRolling', characteristics: { ...validInputs.characteristics } },
    bracket: bracket25,
    allowedMethods: ['StandardRolling'],
    sheet: sheetView({ creationMethod: 'StandardRolling', characteristicRolls: {}, locks: { creationMethod: true, ageBracket: false, edu: false } }),
    roll: { status: { state: 'rolled', group: 'characteristics' }, onRoll: () => {}, onRetry: () => {} },
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
