import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ItemLink } from '@/scenario-preparation/types/Item'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { SceneItemSection } from './scene-item-section'

const diary: ItemLink = { id: 'link-1', item: { id: 'diary', name: "Walter Corbitt's diary" } }
const key: ItemLink = { id: 'link-2', item: { id: 'key', name: 'The cellar key' } }
const longName: ItemLink = {
  id: 'link-3',
  item: { id: 'long', name: 'A water-stained, leather-bound ledger of the Miskatonic Valley Historical Society with a very long name' },
}

const meta = {
  title: 'ScenarioPreparation/SceneItemSection',
  component: SceneItemSection,
  args: {
    campaignId: 'story-campaign',
    scenarioId: 'story-scenario',
    sceneId: 'story-scene',
    status: 'Prepared',
    links: [diary, key],
    onUnlinked: () => undefined,
    onRefetch: () => undefined,
  },
  decorators: [
    (Story) => (
      <StoryMsal tokens="pending">
        <StoryProviders>
          <Story />
        </StoryProviders>
      </StoryMsal>
    ),
  ],
} satisfies Meta<typeof SceneItemSection>

export default meta
type Story = StoryObj<typeof meta>

export const Prepared: Story = {}

export const Active: Story = { args: { status: 'Active' } }

export const Finished: Story = { args: { status: 'Finished' } }

export const NothingLinkedYet: Story = { args: { links: [] } }

/** A long Item name wraps, and Unlink stays on the row at 320px. */
export const LongNameAt320px: Story = {
  args: { links: [longName, diary] },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
}
