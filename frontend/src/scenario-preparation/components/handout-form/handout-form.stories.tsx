import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import type { HandoutFormValues } from '@/scenario-preparation/services/handoutForm'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { HandoutForm } from './handout-form'

const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const empty: HandoutFormValues = { title: '', kind: null, visibility: null, content: null }
const prefilled: HandoutFormValues = {
  title: 'The front door',
  kind: 'ReadAloud',
  visibility: 'PlayerFacing',
  content: { root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [text('You stand before the door.')] }] } },
}

const meta = {
  title: 'ScenarioPreparation/HandoutForm',
  component: HandoutForm,
  args: {
    initialValues: empty,
    submitLabel: 'Add Handout',
    busyLabel: 'Adding...',
    pending: false,
    cancel: <a href="/">Cancel</a>,
    onSubmit: () => undefined,
  },
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof HandoutForm>

export default meta
type Story = StoryObj<typeof meta>

/** No kind and no visibility are chosen. */
export const Empty: Story = {}

export const Prefilled: Story = { args: { initialValues: prefilled, submitLabel: 'Save', busyLabel: 'Saving...' } }

/** Submitting the empty form shows every error and focuses the title. */
export const EveryClientError: Story = {
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole('button', { name: 'Add Handout' })
    await userEvent.click(buttons[buttons.length - 1])
  },
}

export const ServerErrors: Story = {
  args: {
    initialValues: prefilled,
    serverErrors: {
      title: 'Enter a title.',
      kind: 'Choose Read-aloud or Text.',
      visibility: 'Choose who can see this Handout.',
      content: "This text can't be saved. Shorten it or remove unsupported content.",
    },
  },
}

export const Busy: Story = { args: { initialValues: prefilled, pending: true } }

export const Failure: Story = { args: { initialValues: prefilled, failureMessage: "We couldn't add the Handout. Try again." } }

export const ImageKind: Story = {
  args: { initialValues: { ...empty, kind: 'Image' } },
}

export const DocumentKind: Story = {
  args: { initialValues: { ...empty, kind: 'Document' } },
}

export const MapKind: Story = {
  args: { initialValues: { ...empty, kind: 'Map' } },
}

export const NoKindChosen: Story = {}

export const EditImage: Story = {
  args: {
    initialValues: {
      title: 'Corbitt House',
      kind: 'Image',
      visibility: 'PlayerFacing',
      content: null,
      storedFile: { name: 'corbitt-house.png', mediaType: 'image/png', sizeBytes: 1_258_291 },
    },
    submitLabel: 'Save',
    busyLabel: 'Saving...',
  },
}

export const EditDocument: Story = {
  args: {
    initialValues: {
      title: 'Diary',
      kind: 'Document',
      visibility: 'KeeperFacing',
      content: null,
      storedFile: { name: 'diary-page.pdf', mediaType: 'application/pdf', sizeBytes: 870_400 },
    },
    submitLabel: 'Save',
    busyLabel: 'Saving...',
  },
}
