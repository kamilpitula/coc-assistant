import type { Meta, StoryObj } from '@storybook/react-vite'

import { SkillAllocationTable } from './skill-allocation-table'

const meta = {
  title: 'CampaignPlay/SkillAllocationTable',
  component: SkillAllocationTable,
  args: {
    caption: 'Occupation skills',
    controlHeading: 'Points',
    rows: [
      { key: 'cr', name: 'Credit Rating', hint: 'Must be between 30 and 70', base: 0, total: 30, control: <span>30</span> },
      { key: 'lib', name: 'Library Use', base: 20, total: 70, control: <span>50</span> },
      { key: 'dodge', name: 'Dodge', base: null, total: null, control: <span>-</span> },
    ],
  },
} satisfies Meta<typeof SkillAllocationTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
