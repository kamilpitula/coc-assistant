import type { Meta, StoryObj } from '@storybook/react-vite'

import { AddSectionGroup } from './add-section-group'

const meta = {
  title: 'ScenarioPreparation/AddSectionGroup',
  component: AddSectionGroup,
  args: {
    available: ['characteristics', 'skills', 'combat', 'spells'],
    labels: { characteristics: 'Characteristics', skills: 'Skills', combat: 'Combat', spells: 'Spells' },
    onAdd: () => undefined,
  },
} satisfies Meta<typeof AddSectionGroup>

export default meta
type Story = StoryObj<typeof meta>

export const AllAvailable: Story = {}
export const SomeLeft: Story = { args: { available: ['combat', 'spells'] } }
export const NoneLeft: Story = { args: { available: [] } }
