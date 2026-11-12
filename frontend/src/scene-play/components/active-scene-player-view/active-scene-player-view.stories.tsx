import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { WallEntryPage } from '@/campaign-play/types/WallEntry'
import type { RichTextDocument } from '@/shared/types/RichText'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ActiveScenePlayerView } from './active-scene-player-view'

const CAMPAIGN_ID = 'story-campaign'

const wall: WallEntryPage = {
  nextCursor: null,
  entries: [
    {
      id: 'w1',
      text: 'The front door slams shut behind Harvey.',
      visibility: 'Public',
      createdAt: '2026-10-28T19:14:00Z',
      authorDisplayName: 'Keeper',
      kind: 'Text',
      rollRequestId: null,
    },
  ],
}

const meta = {
  title: 'ScenePlay/ActiveScenePlayerView',
  component: ActiveScenePlayerView,
  args: { campaignId: CAMPAIGN_ID, headingRef: { current: null }, onWallEntryAdded: () => undefined },
  decorators: [
    (Story) => (
      <StoryMsal tokens="pending">
        <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.wallPreview(CAMPAIGN_ID), wall)}>
          <SidePanelScopeProvider>
            <Story />
          </SidePanelScopeProvider>
        </StoryProviders>
      </StoryMsal>
    ),
  ],
} satisfies Meta<typeof ActiveScenePlayerView>

export default meta
type Story = StoryObj<typeof meta>

export const Present: Story = {
  args: {
    scene: {
      kind: 'present-player',
      reveals: [],
      title: 'The Corbitt House',
      location: 'Arkham, Boston Road',
      investigatorsPresent: [{ name: 'Harvey Walters', isYours: true }, { name: 'Lucy Ward', isYours: false }],
    },
  },
}

const paragraph = (value: string): RichTextDocument => ({
  root: { type: 'root', children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' }] }] },
})

export const WithReveals: Story = {
  args: {
    scene: {
      kind: 'present-player',
      title: 'The Corbitt House',
      location: 'Arkham, Boston Road',
      investigatorsPresent: [{ name: 'Harvey Walters', isYours: true }, { name: 'Lucy Ward', isYours: false }],
      reveals: [
        { revealId: 'r2', revealedAt: '2026-10-28T19:58:00Z', subjectType: 'Handout', title: 'The cellar door', handoutKind: 'ReadAloud', content: paragraph('The door is cold to the touch.'), file: null, imageDescription: null },
        { revealId: 'r1', revealedAt: '2026-10-28T19:52:00Z', subjectType: 'NonPlayerEntity', title: 'A nervous clerk', handoutKind: null, content: paragraph('He keeps looking at the door.'), file: null, imageDescription: null },
      ],
    },
  },
}

export const NotPresent: Story = { args: { scene: { kind: 'absent-player', title: 'The Corbitt House' } } }
