import type { Meta, StoryObj } from '@storybook/react-vite'

import { DiceRollInput } from './dice-roll-input'

const meta = {
  title: 'CampaignPlay/DiceRollInput',
  component: DiceRollInput,
  args: { field: 'luckRolls[0]', rollLabel: 'Luck', dice: '3D6', multiplier: 5, onChange: () => {} },
} satisfies Meta<typeof DiceRollInput>

export default meta
type Story = StoryObj<typeof meta>

export const Entered: Story = { args: { value: 11 } }

export const Empty: Story = { args: { value: null } }

export const OutOfRange: Story = { args: { value: 19, error: 'Enter a 3D6 result between 3 and 18.' } }
