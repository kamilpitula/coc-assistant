import type { Meta, StoryObj } from '@storybook/react-vite'

import type { WallEntry } from '@/campaign-play/types/WallEntry'

import { WallEntryList } from './wall-entry-list'

const entries: WallEntry[] = [
  {
    id: 'e3',
    text: 'The lamp flickers and goes out.',
    visibility: 'Public',
    createdAt: '2026-10-16T19:02:00Z',
    authorDisplayName: 'Eleanor Hart',
  },
  {
    id: 'e2',
    text: 'Ana finds a torn letter in the desk.',
    visibility: 'KeeperOnly',
    createdAt: '2026-10-16T18:55:00Z',
    authorDisplayName: 'Eleanor Hart',
  },
  {
    id: 'e1',
    text: `A very long word: ${'Pneumonoultramicroscopicsilicovolcanoconiosis'.repeat(3)}\nSecond line.`,
    visibility: 'Public',
    createdAt: '2025-10-03T19:02:00Z',
    authorDisplayName: 'Ana Ruiz with a rather long display name for narrow screens',
  },
]

const meta = {
  title: 'CampaignPlay/WallEntryList',
  component: WallEntryList,
  args: { entries, viewerRole: 'Keeper', fallbackFocusId: 'wall-entry-text', onRemove: async () => true },
} satisfies Meta<typeof WallEntryList>

export default meta
type Story = StoryObj<typeof meta>

export const Keeper: Story = {}

export const Player: Story = {
  args: { viewerRole: 'Player', entries: entries.filter((entry) => entry.visibility === 'Public') },
}
