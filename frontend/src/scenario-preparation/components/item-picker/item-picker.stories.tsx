import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { userEvent, within } from 'storybook/test'

import type { ItemSummary } from '@/scenario-preparation/types/Item'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { ItemPicker } from './item-picker'

const diary: ItemSummary = { id: 'diary', name: "Walter Corbitt's diary", sceneCount: 1 }
const key: ItemSummary = { id: 'key', name: 'The cellar key', sceneCount: 0 }
const lamp: ItemSummary = { id: 'lamp', name: 'Oil lamp', sceneCount: 0 }
const longName: ItemSummary = {
  id: 'long',
  name: 'A water-stained, leather-bound ledger of the Miskatonic Valley Historical Society with a very long name',
  sceneCount: 0,
}

interface StoryArgs {
  items?: ItemSummary[]
  linkedIds?: string[]
  initial?: string | null
  error?: string
  isPending?: boolean
  isError?: boolean
  width?: number
}

function PickerStory({ items = [diary, key, lamp], linkedIds = [], initial = null, error, isPending = false, isError = false, width }: StoryArgs) {
  const [value, setValue] = useState<string | null>(initial)

  return (
    <StoryProviders>
      <div style={width ? { width } : undefined}>
        <ItemPicker
          campaignId="story-campaign"
          items={items}
          isPending={isPending}
          isError={isError}
          onRetry={() => undefined}
          linkedIds={linkedIds}
          value={value}
          onChange={setValue}
          error={error}
          errorId="picker-error"
        />
      </div>
    </StoryProviders>
  )
}

const meta = {
  title: 'ScenarioPreparation/ItemPicker',
  component: PickerStory,
} satisfies Meta<typeof PickerStory>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OneItemAlreadyInTheScene: Story = { args: { linkedIds: ['diary'] } }

export const ChoiceKeptWhileTheSearchHidesIt: Story = {
  args: { initial: 'key' },
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText('Search by name'), 'lamp')
  },
}

export const NoMatch: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(within(canvasElement).getByLabelText('Search by name'), 'zzz')
  },
}

export const EmptyCampaign: Story = { args: { items: [] } }

export const Loading: Story = { args: { isPending: true } }

export const LoadError: Story = { args: { isError: true } }

export const WithError: Story = { args: { error: 'Choose an Item.' } }

/** A long Item name wraps beside its radio at 320px. */
export const LongNameAt320px: Story = { args: { items: [longName, key], width: 320 } }
