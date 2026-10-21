import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { userEvent, within } from 'storybook/test'

import type { NonPlayerEntitySummary } from '@/scenario-preparation/types/NonPlayerEntity'
import type { NonPlayerEntityReference } from '@/scenario-preparation/types/Scene'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { NonPlayerEntityPicker } from './non-player-entity-picker'

const humans: NonPlayerEntitySummary[] = Array.from({ length: 12 }, (_, index) => ({
  id: `h${index}`,
  type: 'HumanNpc',
  name: `Human NPC ${index + 1}`,
}))
const knott: NonPlayerEntitySummary = { id: 'knott', type: 'HumanNpc', name: 'Mr. Knott' }
const ghoul: NonPlayerEntitySummary = { id: 'ghoul', type: 'MythosCreature', name: 'Ghoul' }

interface StoryArgs {
  entities?: NonPlayerEntitySummary[]
  isPending?: boolean
  isError?: boolean
  linked?: NonPlayerEntityReference[]
  initial?: NonPlayerEntityReference | null
}

function PickerStory({ entities, isPending = false, isError = false, linked = [], initial = null }: StoryArgs) {
  const [value, setValue] = useState<NonPlayerEntityReference | null>(initial)
  return (
    <StoryProviders>
      <div className="max-w-2xl">
        <NonPlayerEntityPicker
          campaignId="story-campaign"
          entities={entities}
          isPending={isPending}
          isError={isError}
          onRetry={() => undefined}
          linked={linked}
          value={value}
          onChange={setValue}
          errorId="picker-error"
        />
      </div>
    </StoryProviders>
  )
}

const meta = {
  title: 'ScenarioPreparation/NonPlayerEntityPicker',
  component: PickerStory,
} satisfies Meta<typeof PickerStory>

export default meta
type Story = StoryObj<typeof meta>

export const EmptyCampaign: Story = { args: { entities: [] } }

export const ManyEntities: Story = { args: { entities: [...humans, knott, ghoul] } }

export const Filtered: Story = {
  args: { entities: [knott, ghoul, ...humans] },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText('Search by name'), 'kno')
  },
}

export const NoMatch: Story = {
  args: { entities: [knott, ghoul] },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText('Search by name'), 'zzz')
  },
}

/** Ghoul is chosen, then the filter hides it; the Selected line still names it. */
export const SelectedButHidden: Story = {
  args: { entities: [knott, ghoul], initial: { type: 'MythosCreature', id: 'ghoul' } },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText('Search by name'), 'kno')
  },
}

export const AlreadyLinked: Story = { args: { entities: [knott, ghoul], linked: [{ type: 'HumanNpc', id: 'knott' }] } }

export const Loading: Story = { args: { isPending: true } }

export const LoadError: Story = { args: { isError: true } }
