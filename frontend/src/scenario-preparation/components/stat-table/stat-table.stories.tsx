import type { Meta, StoryObj } from '@storybook/react-vite'

import { StatTable } from './stat-table'

const meta = {
  title: 'ScenarioPreparation/StatTable',
  component: StatTable,
  args: {
    label: 'Skills',
    columns: ['Skill', 'Value', 'Investigator difficulty'],
    rows: [
      ['Spot Hidden', '55', 'Hard'],
      ['Firearms (Handgun)', '90', 'Extreme'],
      ['Listen', '20', 'Regular'],
    ],
  },
} satisfies Meta<typeof StatTable>

export default meta
type Story = StoryObj<typeof meta>

export const Wide: Story = {}
export const Narrow320: Story = { decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>] }
