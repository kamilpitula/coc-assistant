import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { NO_CREATION_METHOD_MESSAGE } from '@/campaign-play/components/creation-methods-fieldset/creationMethodLabels'
import type { CreationMethod } from '@/campaign-play/types/Campaign'

import { RulesOptionsCollapsible } from './rules-options-collapsible'

function Interactive({
  initialOpen,
  initialMethods,
  error,
}: {
  initialOpen: boolean
  initialMethods: CreationMethod[]
  error?: string
}) {
  const [open, setOpen] = useState(initialOpen)
  const [methods, setMethods] = useState<CreationMethod[]>(initialMethods)
  return (
    <div className="max-w-md">
      <RulesOptionsCollapsible
        open={open}
        onOpenChange={setOpen}
        allowedCreationMethods={methods}
        onAllowedCreationMethodsChange={setMethods}
        error={error}
      />
    </div>
  )
}

const meta = {
  title: 'CampaignPlay/RulesOptionsCollapsible',
  component: Interactive,
} satisfies Meta<typeof Interactive>

export default meta
type Story = StoryObj<typeof meta>

const allMethods: CreationMethod[] = ['StandardRolling', 'PointBuy', 'QuickFire']

export const Collapsed: Story = {
  args: { initialOpen: false, initialMethods: allMethods },
}

export const Expanded: Story = {
  args: { initialOpen: true, initialMethods: allMethods },
}

export const NoMethodChosen: Story = {
  args: { initialOpen: true, initialMethods: [], error: NO_CREATION_METHOD_MESSAGE },
}
