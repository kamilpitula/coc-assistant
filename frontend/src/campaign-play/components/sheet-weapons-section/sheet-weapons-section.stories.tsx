import type { Meta, StoryObj } from '@storybook/react-vite'
import { useReducer } from 'react'

import { characterSheetFormReducer } from '@/campaign-play/state/characterSheetForm'
import { validInputs } from '@/campaign-play/test-support/characterSheetFixtures'

import { SheetWeaponsSection } from './sheet-weapons-section'

const revolver = { name: '.38 Revolver', skill: 'Firearms (Handgun)', damage: '1D10', attacks: '1 (3)', range: '15 yards', ammo: '6', malfunction: '100' }
const knife = { name: 'Knife', skill: 'Fighting (Brawl)', damage: '1D4', attacks: '1', range: null, ammo: null, malfunction: null }

const meta = {
  title: 'CampaignPlay/SheetWeaponsSection',
  component: SheetWeaponsSection,
} satisfies Meta<typeof SheetWeaponsSection>

export default meta
type Story = StoryObj<typeof meta>

export const ReadOnly: Story = { args: { weapons: [revolver, knife] } }

export const NoneRecorded: Story = { args: { weapons: [] } }

function EditingSection({ errors }: { errors: Record<string, string> }) {
  const [inputs, dispatch] = useReducer(characterSheetFormReducer, { ...validInputs, weapons: [revolver, { ...knife, name: null }] })
  return <SheetWeaponsSection weapons={inputs.weapons} editing={{ inputs, errors, onAction: dispatch, onBlur: () => {} }} />
}

export const Editing: Story = {
  args: { weapons: [] },
  render: () => <EditingSection errors={{ 'weapons[1].name': 'Enter a name for this weapon.' }} />,
}
