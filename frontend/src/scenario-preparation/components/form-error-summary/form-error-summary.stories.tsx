import type { Meta, StoryObj } from '@storybook/react-vite'

import { FormErrorSummary } from './form-error-summary'

const meta = {
  title: 'ScenarioPreparation/FormErrorSummary',
  component: FormErrorSummary,
  args: { problems: [{ message: 'Enter a name.', path: 'name' }], onSelect: () => undefined },
} satisfies Meta<typeof FormErrorSummary>

export default meta
type Story = StoryObj<typeof meta>

export const OneProblem: Story = {}

export const SeveralProblems: Story = {
  args: {
    problems: [
      { message: 'Enter STR from 0 to 100.', path: 'characteristics.STR' },
      { message: 'Enter the damage.', path: 'combat.weapons[0].damage' },
      { message: 'Add at most 100 skills.', path: null },
    ],
  },
}
