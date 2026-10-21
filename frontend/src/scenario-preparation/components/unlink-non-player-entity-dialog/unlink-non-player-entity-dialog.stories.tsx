import type { Meta, StoryObj } from '@storybook/react-vite'

import { UnlinkNonPlayerEntityDialog } from './unlink-non-player-entity-dialog'

const meta = {
  title: 'ScenarioPreparation/UnlinkNonPlayerEntityDialog',
  component: UnlinkNonPlayerEntityDialog,
  args: {
    open: true,
    playerFacingName: 'A shape in the cellar',
    profileName: 'Ghoul',
    pending: false,
    failed: false,
    refused: false,
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof UnlinkNonPlayerEntityDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {}

export const Unlinking: Story = { args: { pending: true } }

export const Failure: Story = { args: { failed: true } }

export const Refused: Story = { args: { refused: true } }
