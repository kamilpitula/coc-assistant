import type { Meta, StoryObj } from '@storybook/react-vite'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import { keeperCampaign, keeperRosterAllApproved, STORY_CAMPAIGN_ID } from '@/campaign-play/test-support/rosterFixtures'
import type { SkillCatalog } from '@/campaign-play/types/RuleData'
import type { WallEntryPage } from '@/campaign-play/types/WallEntry'
import { rollRequestQueryKeys } from '@/roll-requests/services/rollRequestApi'
import { sceneQueryKeys } from '@/scenario-preparation/services/sceneApi'
import { paragraph } from '@/scene-play/test-support/revealFixtures'
import type { KeeperActiveScene } from '@/scene-play/types/ActiveScene'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { RunView } from './run-view'

const scene: KeeperActiveScene = {
  kind: 'keeper',
  sceneId: 'story-scene',
  scenarioId: 'story-scenario',
  scenarioTitle: 'The Haunting',
  title: 'The Corbitt House',
  location: 'Arkham, Boston Road',
  startedAt: '2026-10-28T19:40:00Z',
  investigatorsPresent: [{ id: 'i-a', name: 'Dr. Ames' }, { id: 'i-c', name: 'Mae Doyle' }],
  reveals: [],
}

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

const catalog: SkillCatalog = {
  era: '1920s',
  skills: [
    { skill: 'Fighting', specialization: null, base: { kind: 'fixed', value: 25 } },
    { skill: 'Listen', specialization: null, base: { kind: 'fixed', value: 20 } },
    { skill: 'Spot Hidden', specialization: null, base: { kind: 'fixed', value: 25 } },
  ],
  closedFamilies: [],
  openFamilies: [],
  specializationSuggestions: {},
}

function ViewStory() {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          client.setQueryData(campaignQueryKeys.detail(STORY_CAMPAIGN_ID), keeperCampaign)
          client.setQueryData(campaignQueryKeys.members(STORY_CAMPAIGN_ID), keeperRosterAllApproved)
          client.setQueryData(campaignQueryKeys.wallPreview(STORY_CAMPAIGN_ID), wall)
          client.setQueryData(sceneQueryKeys.detail(STORY_CAMPAIGN_ID, scene.scenarioId, scene.sceneId), {
            keeperNotes: paragraph('Walter is in the cellar. He attacks if the door is forced.'),
          })
          client.setQueryData(campaignQueryKeys.skills(STORY_CAMPAIGN_ID), catalog)
          client.setQueryData(rollRequestQueryKeys.activeScene(STORY_CAMPAIGN_ID), [])
        }}
      >
        <RunView campaignId={STORY_CAMPAIGN_ID} scene={scene} onPresentSaved={() => undefined} onWallEntryAdded={() => undefined} onFinishedMeanwhile={() => undefined} onRollRequested={() => undefined} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenePlay/RunView',
  component: ViewStory,
} satisfies Meta<typeof ViewStory>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
