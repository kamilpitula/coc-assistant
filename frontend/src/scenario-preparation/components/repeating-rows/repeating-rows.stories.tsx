import type { Meta, StoryObj } from '@storybook/react-vite'

import { RepeatingRows } from './repeating-rows'

const meta = {
  title: 'ScenarioPreparation/RepeatingRows',
  component: RepeatingRows,
  args: {
    item: 'skill',
    items: 'skills',
    count: 1,
    addButtonId: 'add-skills',
    onAdd: () => undefined,
    children: <p className="text-sm">A row</p>,
  },
} satisfies Meta<typeof RepeatingRows>

export default meta
type Story = StoryObj<typeof meta>

export const NoRows: Story = { args: { count: 0, children: null } }
export const OneRow: Story = {}
export const AtTheLimit: Story = { args: { count: 100 } }
