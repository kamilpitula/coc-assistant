import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import type { NonPlayerEntityLinkFormValues } from '@/scenario-preparation/services/nonPlayerEntityLinkForm'
import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SceneLinkForm, type SceneLinkFormPicker } from './scene-link-form'

const entities: NonPlayerEntitySummary[] = [
  { id: 'knott', type: 'HumanNpc', name: 'Mr. Knott' },
  { id: 'ghoul', type: 'MythosCreature', name: 'Ghoul' },
]
const picker: SceneLinkFormPicker = {
  campaignId: 'story-campaign',
  entities,
  isPending: false,
  isError: false,
  onRetry: () => undefined,
  linked: [],
}
const empty: NonPlayerEntityLinkFormValues = { nonPlayerEntity: null, playerFacingName: '', playerFacingDescription: null }

const meta = {
  title: 'ScenarioPreparation/SceneLinkForm',
  component: SceneLinkForm,
  args: {
    picker,
    initialValues: empty,
    submitLabel: 'Link',
    busyLabel: 'Linking...',
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
} satisfies Meta<typeof SceneLinkForm>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

/** Submitting the empty form shows the entity and name errors and focuses the picker. */
export const EveryClientError: Story = {
  play: async ({ canvasElement }) => {
    const buttons = within(canvasElement).getAllByRole('button', { name: 'Link' })
    await userEvent.click(buttons[buttons.length - 1])
  },
}

export const ServerErrors: Story = {
  args: {
    serverErrors: {
      nonPlayerEntity: 'Choose a Non-Player Entity from this Campaign.',
      playerFacingName: 'Enter a Player-facing name.',
      playerFacingDescription: "This Player-facing description can't be saved. Shorten it or remove unsupported content.",
    },
  },
}

export const Busy: Story = { args: { pending: true } }

export const Failure: Story = { args: { failureMessage: "We couldn't link the Non-Player Entity. Try again." } }

export const FinishedConflict: Story = {
  args: { failureMessage: "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel." },
}

export const Editing: Story = {
  args: {
    picker: undefined,
    initialValues: { nonPlayerEntity: null, playerFacingName: 'A shape in the cellar', playerFacingDescription: null },
    submitLabel: 'Save',
    busyLabel: 'Saving...',
    autoFocusName: true,
  },
}
