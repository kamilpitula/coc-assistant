import type { Meta, StoryObj } from '@storybook/react-vite'

import { InvestigatorsPresentFieldset } from './investigators-present-fieldset'

const meta = {
  title: 'ScenePlay/InvestigatorsPresentFieldset',
  component: InvestigatorsPresentFieldset,
  args: {
    investigators: [
      { id: 'i1', name: 'Harvey Walters', playerName: 'Ana Ruiz' },
      { id: 'i2', name: 'Lucy Ward', playerName: 'Ben Cole' },
    ],
    selected: ['i1', 'i2'],
    onToggle: () => undefined,
  },
} satisfies Meta<typeof InvestigatorsPresentFieldset>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const UnnamedInvestigator: Story = {
  args: { investigators: [{ id: 'i1', name: null, playerName: 'Ana Ruiz' }], selected: ['i1'] },
}

export const LongNameAt320px: Story = {
  decorators: [(StoryComponent) => <div style={{ width: 320 }}><StoryComponent /></div>],
  args: {
    investigators: [{ id: 'i1', name: 'Dr. Bartholomew Archibald Winterbottom-Featherstonehaugh the Third', playerName: 'Ana Ruiz-Hernandez de la Fuente' }],
    selected: [],
  },
}

export const WithError: Story = { args: { selected: [], error: 'Choose at least one Investigator present.' } }
