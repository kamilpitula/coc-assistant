import type { Meta, StoryObj } from '@storybook/react-vite'

import type { SceneInput } from '@/scenario-preparation/types/Scene'
import type { RichTextDocument } from '@/shared/types/RichText'

import { SceneForm } from './scene-form'

const formatted: RichTextDocument = {
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [
          { type: 'text', version: 1, text: 'The key is ', format: 0, style: '', detail: 0, mode: 'normal' },
          { type: 'text', version: 1, text: 'under the stairs', format: 1, style: '', detail: 0, mode: 'normal' },
        ],
      },
    ],
  },
}

const empty: SceneInput = { title: '', location: '', keeperNotes: null }

const meta = {
  title: 'ScenarioPreparation/SceneForm',
  component: SceneForm,
  args: {
    initialValues: empty,
    submitLabel: 'Create Scene',
    busyLabel: 'Creating...',
    pending: false,
    cancel: <a href="/">Cancel</a>,
    onSubmit: () => undefined,
  },
} satisfies Meta<typeof SceneForm>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const PrefilledWithFormattedNotes: Story = {
  args: {
    initialValues: { title: 'The Corbitt House', location: 'Arkham, Boston Road', keeperNotes: formatted },
    submitLabel: 'Save',
    busyLabel: 'Saving...',
  },
}

export const EveryFieldError: Story = {
  args: {
    initialValues: { title: '', location: '', keeperNotes: formatted },
    serverErrors: {
      title: 'Enter a title.',
      location: 'Location must be 200 characters or fewer.',
      keeperNotes: "These Keeper notes can't be saved. Shorten them or remove unsupported content.",
    },
  },
}

export const Failure: Story = { args: { failureMessage: "We couldn't create the Scene. Try again." } }

export const Busy: Story = { args: { pending: true } }
