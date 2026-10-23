import type { Meta, StoryObj } from '@storybook/react-vite'

import type { ItemScene } from '@/scenario-preparation/types/Item'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ItemScenesSection } from './item-scenes-section'

const prepared: ItemScene = { scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a2', title: 'The cellar', status: 'Prepared' }
const active: ItemScene = { scenarioId: 's1', scenarioTitle: 'The Haunting', id: 'a1', title: 'The Corbitt House', status: 'Active' }
const finished: ItemScene = { scenarioId: 's2', scenarioTitle: 'Edge of Darkness', id: 'a3', title: 'Arkham Library', status: 'Finished' }
const long: ItemScene = {
  scenarioId: 's3',
  scenarioTitle: 'The extraordinarily long and winding title of a Scenario set in the Miskatonic Valley',
  id: 'a4',
  title: 'A Scene whose title is long enough to wrap onto several lines on a narrow screen',
  status: 'Prepared',
}

const meta = {
  title: 'ScenarioPreparation/ItemScenesSection',
  component: ItemScenesSection,
  args: { campaignId: 'story-campaign' },
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof ItemScenesSection>

export default meta
type Story = StoryObj<typeof meta>

export const NotLinked: Story = { args: { scenes: [] } }

export const SeveralScenes: Story = { args: { scenes: [prepared, active, finished] } }

export const LongTitles: Story = { args: { scenes: [long] } }
