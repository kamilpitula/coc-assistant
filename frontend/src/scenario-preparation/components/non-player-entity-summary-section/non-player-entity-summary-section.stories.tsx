import type { Meta, StoryObj } from '@storybook/react-vite'

import { nonPlayerEntityQueryKeys } from '@/scenario-preparation/services/nonPlayerEntityApi'
import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { NonPlayerEntitySummarySection } from './non-player-entity-summary-section'

const CAMPAIGN_ID = 'story-campaign'

const human = (id: string): NonPlayerEntitySummary => ({ id, type: 'HumanNpc', name: `Human NPC ${id}` })
const creature = (id: string): NonPlayerEntitySummary => ({ id, type: 'MythosCreature', name: `Creature ${id}` })

interface StoryArgs {
  items?: NonPlayerEntitySummary[]
  tokens?: 'pending' | 'failing'
}

function SectionStory({ items, tokens = 'pending' }: StoryArgs) {
  return (
    <StoryMsal tokens={tokens}>
      <StoryProviders
        seed={(client) => {
          if (items) {
            client.setQueryData(nonPlayerEntityQueryKeys.list(CAMPAIGN_ID), items)
          }
        }}
      >
        <NonPlayerEntitySummarySection campaignId={CAMPAIGN_ID} />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/NonPlayerEntitySummarySection',
  component: SectionStory,
} satisfies Meta<typeof SectionStory>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = { args: { items: [] } }
export const OnlyHumanNpcs: Story = { args: { items: [human('1'), human('2'), human('3')] } }
export const BothTypesSingular: Story = { args: { items: [human('1'), creature('1')] } }
export const BothTypesPlural: Story = { args: { items: [human('1'), human('2'), creature('1'), creature('2')] } }
export const Loading: Story = {}
export const LoadError: Story = { args: { tokens: 'failing' } }
