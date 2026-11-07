import type { Meta, StoryObj } from '@storybook/react-vite'

import { STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import { sceneHistoryQueryKeys } from '@/scene-play/services/sceneHistoryApi'
import { keeperReveal, mapReveal, readAloudReveal, textReveal } from '@/scene-play/test-support/revealFixtures'
import type { KeeperSceneHistory, PlayerSceneHistory } from '@/scene-play/types/SceneHistory'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SceneHistoryPage } from './scene-history-page'

const keeperHistory: KeeperSceneHistory = {
  kind: 'keeper',
  scenes: [
    {
      sceneId: 'story-active',
      scenarioId: 'story-scenario',
      scenarioTitle: 'The Haunting',
      title: 'The Corbitt House',
      startedAt: '2026-11-07T19:05:00Z',
      finishedAt: null,
      investigatorsPresent: [
        { id: 'i-harvey', name: 'Harvey Walters' },
        { id: 'i-lucy', name: 'Lucy Ward' },
      ],
      reveals: [keeperReveal(readAloudReveal, 'h-front-door', ['Harvey Walters', 'Lucy Ward'])],
    },
    {
      sceneId: 'story-finished',
      scenarioId: 'story-scenario',
      scenarioTitle: 'The Haunting',
      title: 'The Speakeasy',
      startedAt: '2026-10-31T19:10:00Z',
      finishedAt: '2026-10-31T21:00:00Z',
      investigatorsPresent: [{ id: 'i-harvey', name: 'Harvey Walters' }],
      reveals: [keeperReveal(textReveal, 'h-letter', ['Harvey Walters']), keeperReveal(mapReveal, 'h-cellar', ['Harvey Walters'])],
    },
  ],
}

const playerHistory: PlayerSceneHistory = {
  kind: 'player',
  investigatorName: 'Harvey Walters',
  scenes: [
    {
      sceneId: 'story-active',
      scenarioTitle: 'The Haunting',
      title: 'The Corbitt House',
      startedAt: '2026-11-07T19:05:00Z',
      finishedAt: null,
      reveals: [readAloudReveal],
    },
    {
      sceneId: 'story-finished',
      scenarioTitle: 'The Haunting',
      title: 'The Speakeasy',
      startedAt: '2026-10-31T19:10:00Z',
      finishedAt: '2026-10-31T21:00:00Z',
      reveals: [],
    },
  ],
}

interface PageStoryArgs {
  role?: 'keeper' | 'player' | 'without-investigator' | 'empty'
  tokens?: 'pending' | 'failing' | 'granted'
}

function PageStory({ role = 'player', tokens = 'granted' }: PageStoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          if (tokens !== 'granted') {
            return
          }
          if (role === 'keeper') {
            client.setQueryData(sceneHistoryQueryKeys.detail(STORY_CAMPAIGN_ID), keeperHistory)
          } else if (role === 'player') {
            client.setQueryData(sceneHistoryQueryKeys.detail(STORY_CAMPAIGN_ID), playerHistory)
          } else if (role === 'without-investigator') {
            client.setQueryData(sceneHistoryQueryKeys.detail(STORY_CAMPAIGN_ID), {
              ...playerHistory,
              investigatorName: null,
              scenes: playerHistory.scenes.map((scene) => ({ ...scene, reveals: [] })),
            })
          } else {
            client.setQueryData(sceneHistoryQueryKeys.detail(STORY_CAMPAIGN_ID), { ...keeperHistory, scenes: [] })
          }
        }}
      >
        <SceneHistoryPage campaignId={STORY_CAMPAIGN_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/SceneHistoryPage',
  component: PageStory,
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

export const Player: Story = {}

export const Keeper: Story = { args: { role: 'keeper' } }

export const PlayerWithoutAnInvestigator: Story = { args: { role: 'without-investigator' } }

export const NoScenePlayed: Story = { args: { role: 'empty' } }

export const Loading: Story = { args: { tokens: 'pending' } }

export const LoadFailed: Story = { args: { tokens: 'failing' } }

/** The meta lines wrap between their parts at 320px. */
export const At320px: Story = {
  args: { role: 'keeper' },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
}
