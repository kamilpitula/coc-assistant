import type { Meta, StoryObj } from '@storybook/react-vite'

import { handoutQueryKeys } from '@/scenario-preparation/services/handoutApi'
import type { SceneHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import type { Handout } from '@/scenario-preparation/types/Handout'
import { SidePanelScopeProvider } from '@/shared/components/side-panel/side-panel-scope'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { HandoutPanelBody } from './handout-panel-body'

const owner: SceneHandoutOwner = { type: 'scene', campaignId: 'story-campaign', scenarioId: 'story-scenario', sceneId: 'story-scene' }
const text = (value: string) => ({ type: 'text', version: 1, text: value, format: 0, style: '', detail: 0, mode: 'normal' })
const handout: Handout = {
  id: 'story-handout',
  kind: 'ReadAloud',
  visibility: 'PlayerFacing',
  title: 'The front door',
  content: {
    root: {
      type: 'root',
      children: [
        { type: 'heading', version: 1, tag: 'h3', children: [text('Inside')] },
        { type: 'paragraph', version: 1, children: [text('The door creaks open onto a cold hall.')] },
      ],
    },
  },
}

interface BodyStoryArgs {
  data?: Handout | null
  loading?: boolean
}

function BodyStory({ data = handout, loading = false }: BodyStoryArgs) {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders
        seed={(client) => {
          if (!loading && data !== undefined) {
            client.setQueryData(handoutQueryKeys.detail(owner, 'story-handout'), data)
          }
        }}
      >
        <SidePanelScopeProvider>
          <HandoutPanelBody owner={owner} handoutId="story-handout" />
        </SidePanelScopeProvider>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/HandoutPanelBody',
  component: BodyStory,
} satisfies Meta<typeof BodyStory>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const UnknownHandout: Story = { args: { data: null } }

export const Loading: Story = { args: { loading: true } }
