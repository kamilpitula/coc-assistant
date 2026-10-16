import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '@/shared/components/ui/button'

import { ScenarioForm } from './scenario-form'

const meta = {
  title: 'ScenarioPreparation/ScenarioForm',
  component: ScenarioForm,
  args: {
    initialValues: { title: '', keeperNotes: '' },
    submitLabel: 'Create Scenario',
    busyLabel: 'Creating...',
    pending: false,
    cancel: (
      <Button type="button" variant="link" className="px-0">
        Cancel
      </Button>
    ),
    onSubmit: () => {},
  },
} satisfies Meta<typeof ScenarioForm>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Prefilled: Story = {
  args: {
    initialValues: { title: 'The Haunting', keeperNotes: 'The cellar key is under the stairs.\nCorbitt appears after midnight.' },
    submitLabel: 'Save',
    busyLabel: 'Saving...',
  },
}

/** Submit the empty form to see the title error, or use these server errors to see both at once. */
export const EveryFieldError: Story = {
  args: {
    serverErrors: { title: 'Title must be 200 characters or fewer.', keeperNotes: 'Keeper notes must be 10,000 characters or fewer.' },
  },
}

export const Busy: Story = {
  args: { initialValues: { title: 'The Haunting', keeperNotes: '' }, pending: true },
}

export const Failure: Story = {
  args: {
    initialValues: { title: 'The Haunting', keeperNotes: '' },
    failureMessage: "We couldn't create the Scenario. Try again.",
  },
}
