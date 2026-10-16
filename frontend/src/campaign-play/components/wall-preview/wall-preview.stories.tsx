import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { WallEntryPage } from '@/campaign-play/types/WallEntry'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryLiveChange } from '@/shared/storybook/storyLiveChange'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { WallPreview } from './wall-preview'

const CAMPAIGN_ID = 'story-campaign'

const page: WallEntryPage = {
  nextCursor: null,
  entries: [
    {
      id: 'e2',
      text: 'The lamp flickers and goes out.',
      visibility: 'Public',
      createdAt: '2026-10-16T19:02:00Z',
      authorDisplayName: 'Eleanor Hart',
    },
    {
      id: 'e1',
      text: 'Ana finds a torn letter in the desk.',
      visibility: 'KeeperOnly',
      createdAt: '2026-10-16T18:55:00Z',
      authorDisplayName: 'Eleanor Hart',
    },
  ],
}

const arrival: WallEntryPage = {
  nextCursor: null,
  entries: [
    {
      id: 'e3',
      text: 'A knock at the door, three slow raps.',
      visibility: 'Public',
      createdAt: '2026-10-16T19:10:00Z',
      authorDisplayName: 'Ana Ruiz',
    },
    ...page.entries,
  ],
}

function PreviewStory({ seed, liveArrival = false }: { seed: WallEntryPage; liveArrival?: boolean }) {
  return (
    <StoryMsal>
      <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.wallPreview(CAMPAIGN_ID), seed)}>
        <div className="max-w-sm">
          <WallPreview campaignId={CAMPAIGN_ID} />
        </div>
        {liveArrival && (
          <StoryLiveChange apply={(client) => client.setQueryData(campaignQueryKeys.wallPreview(CAMPAIGN_ID), arrival)} />
        )}
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'CampaignPlay/WallPreview',
  component: PreviewStory,
} satisfies Meta<typeof PreviewStory>

export default meta
type Story = StoryObj<typeof meta>

export const WithEntries: Story = { args: { seed: page } }

export const Empty: Story = { args: { seed: { entries: [], nextCursor: null } } }

/** An entry from another member appears at the top about a second and a half after the story loads. */
export const LiveArrival: Story = { args: { seed: page, liveArrival: true } }
