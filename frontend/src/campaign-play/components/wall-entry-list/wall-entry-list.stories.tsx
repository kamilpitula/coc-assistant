import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'

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

function LiveRemovalStory(props: React.ComponentProps<typeof WallEntryList>) {
  const [current, setCurrent] = useState(props.entries)

  useEffect(() => {
    document.getElementById(`remove-wall-entry-${props.entries[1].id}`)?.focus()
    const timer = setTimeout(() => setCurrent(props.entries.filter((entry) => entry.id !== props.entries[1].id)), 3000)
    return () => clearTimeout(timer)
  }, [props.entries])

  return <WallEntryList {...props} entries={current} />
}

/** The focused Remove button of the middle entry loses its entry after three seconds; focus moves to the next one. */
export const LiveRemovalOfTheFocusedEntry: Story = { render: (args) => <LiveRemovalStory {...args} /> }
