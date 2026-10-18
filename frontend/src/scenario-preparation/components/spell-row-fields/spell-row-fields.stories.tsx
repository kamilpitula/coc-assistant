import type { Meta, StoryObj } from '@storybook/react-vite'

import { SpellRowFields } from './spell-row-fields'

const meta = {
  title: 'ScenarioPreparation/SpellRowFields',
  component: SpellRowFields,
  args: {
    list: 'spells',
    item: 'Spell',
    index: 0,
    row: { name: 'Contact Deity', magicPointCost: '5', effect: 'Summons a god.' },
    errorOf: () => undefined,
    onTextChange: () => undefined,
    onRemove: () => undefined,
  },
} satisfies Meta<typeof SpellRowFields>

export default meta
type Story = StoryObj<typeof meta>

export const Spell: Story = {}
export const PowerWithLimits: Story = {
  args: { list: 'powers', item: 'Power', row: { name: 'Drain', magicPointCost: '1', effect: 'Drains.', limits: 'Once per day.' } },
}
