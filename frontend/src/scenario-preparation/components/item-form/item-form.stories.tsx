import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ItemFormValues } from '@/scenario-preparation/types/Item'
import type { RichTextDocument } from '@/shared/types/RichText'

import { ItemForm } from './item-form'

const description: RichTextDocument = {
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
          { type: 'text', version: 1, text: 'A leather diary, ', format: 0, style: '', detail: 0, mode: 'normal' },
          { type: 'text', version: 1, text: 'its last page torn out', format: 1, style: '', detail: 0, mode: 'normal' },
        ],
      },
    ],
  },
}

const empty: ItemFormValues = { name: '', playerFacingDescription: null, keeperNotes: null }

const meta = {
  title: 'ScenarioPreparation/ItemForm',
  component: ItemForm,
  args: {
    initialValues: empty,
    submitLabel: 'Create',
    busyLabel: 'Creating...',
    pending: false,
    cancel: <a href="/">Cancel</a>,
    onSubmit: () => undefined,
  },
} satisfies Meta<typeof ItemForm>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const PrefilledForEdit: Story = {
  args: {
    initialValues: { name: "Walter Corbitt's diary", playerFacingDescription: description, keeperNotes: description },
    submitLabel: 'Save',
    busyLabel: 'Saving...',
  },
}

export const EveryServerError: Story = {
  args: {
    initialValues: { name: 'x', playerFacingDescription: description, keeperNotes: description },
    serverErrors: {
      name: 'Name must be 200 characters or fewer.',
      playerFacingDescription: 'The Player-facing description must use only the allowed rich-text nodes.',
      keeperNotes: 'The Keeper notes must use only the allowed rich-text nodes.',
    },
  },
}

export const Saving: Story = {
  args: { initialValues: { name: 'The cellar key', playerFacingDescription: description, keeperNotes: null }, pending: true },
}

export const SaveFailure: Story = {
  args: {
    initialValues: { name: 'The cellar key', playerFacingDescription: description, keeperNotes: null },
    failureMessage: "We couldn't create the Item. Try again.",
  },
}
