import type { Meta, StoryObj } from '@storybook/react-vite'

import { validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { SheetGearSection } from './sheet-gear-section'

const meta = {
  title: 'CampaignPlay/SheetGearSection',
  component: SheetGearSection,
} satisfies Meta<typeof SheetGearSection>

export default meta
type Story = StoryObj<typeof meta>

export const ReadOnly: Story = { args: { gear: 'Camera and flash powder\nNotebook\nLantern' } }

export const NoneRecorded: Story = { args: { gear: null } }

export const Editing: Story = {
  args: {
    gear: null,
    editing: { inputs: { ...validInputs, gear: 'Lantern' }, errors: {}, onAction: () => {}, onBlur: () => {} },
  },
}
