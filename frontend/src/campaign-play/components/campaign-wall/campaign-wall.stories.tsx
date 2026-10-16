import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { CampaignView } from '@/campaign-play/types/Campaign'
import type { WallEntryPage } from '@/campaign-play/types/WallEntry'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryLiveChange } from '@/shared/storybook/storyLiveChange'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignWall } from './campaign-wall'

const CAMPAIGN_ID = 'story-campaign'

const base = { id: CAMPAIGN_ID, name: 'Haunting of Corbitt House', era: '1920s' as const, allowedCreationMethods: ['PointBuy' as const] }
const keeper: CampaignView = { ...base, keeperAccountId: 'k1', playerLimit: 8, role: 'Keeper' }
const player: CampaignView = { ...base, role: 'Player' }

const page: WallEntryPage = {
  nextCursor: 'older',
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

interface WallStoryProps {
  campaign: CampaignView
  pages: WallEntryPage[]
  liveArrival?: boolean
}

const liveEntry = {
  id: 'e3',
  text: 'A knock at the door, three slow raps.',
  visibility: 'Public' as const,
  createdAt: '2026-10-16T19:10:00Z',
  authorDisplayName: 'Ana Ruiz',
}

function WallStory({ campaign, pages, liveArrival = false }: WallStoryProps) {
  return (
    <StoryMsal>
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(CAMPAIGN_ID), campaign)
          client.setQueryData(campaignQueryKeys.wall(CAMPAIGN_ID), { pages, pageParams: [undefined] })
        }}
      >
        <CampaignWall campaignId={CAMPAIGN_ID} />
        {liveArrival && (
          <StoryLiveChange
            apply={(client) =>
              client.setQueryData(campaignQueryKeys.wall(CAMPAIGN_ID), {
                pages: [{ ...pages[0], entries: [liveEntry, ...pages[0].entries] }, ...pages.slice(1)],
                pageParams: [undefined],
              })
            }
          />
        )}
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'CampaignPlay/CampaignWall',
  component: WallStory,
} satisfies Meta<typeof WallStory>

export default meta
type Story = StoryObj<typeof meta>

export const Keeper: Story = { args: { campaign: keeper, pages: [page] } }

export const Player: Story = { args: { campaign: player, pages: [{ nextCursor: null, entries: [page.entries[0]] }] } }

export const Empty: Story = { args: { campaign: keeper, pages: [{ entries: [], nextCursor: null }] } }

/** An entry from another member appears at the top about a second and a half after the story loads. */
export const LiveArrival: Story = { args: { campaign: keeper, pages: [page], liveArrival: true } }
