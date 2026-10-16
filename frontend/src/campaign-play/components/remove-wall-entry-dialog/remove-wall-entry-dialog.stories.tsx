import type { Meta, StoryObj } from '@storybook/react-vite'

import { RemoveWallEntryDialog } from './remove-wall-entry-dialog'

const publicEntry = {
  id: 'e1',
  text: 'The lamp flickers and goes out.',
  visibility: 'Public',
  createdAt: '2026-10-16T19:02:00Z',
  authorDisplayName: 'Eleanor Hart',
} as const

const meta = {
  title: 'CampaignPlay/RemoveWallEntryDialog',
  component: RemoveWallEntryDialog,
  args: {
    entry: publicEntry,
    pending: false,
    failed: false,
    onConfirm: () => undefined,
    onCancel: () => undefined,
    onCloseAutoFocus: () => undefined,
  },
} satisfies Meta<typeof RemoveWallEntryDialog>

export default meta
type Story = StoryObj<typeof meta>

export const PublicEntry: Story = {}

export const KeeperOnlyEntry: Story = { args: { entry: { ...publicEntry, visibility: 'KeeperOnly' } } }

export const Removing: Story = { args: { pending: true } }

export const RemoveFailed: Story = { args: { failed: true } }
