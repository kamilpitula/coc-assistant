import type { Meta, StoryObj } from '@storybook/react-vite'

import { bareMythosCreature, ghoulMythosCreature } from '@/scenario-preparation/test-support/mythosCreatureFixtures'
import type { ValidationProblem } from '@/scenario-preparation/types/ValidationProblem'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { MythosCreatureForm } from './mythos-creature-form'

interface StoryArgs {
  problems?: ValidationProblem[]
  pending?: boolean
  failureMessage?: string | null
  full?: boolean
  width?: number
}

function FormStory({ problems = [], pending = false, failureMessage = null, full = false, width }: StoryArgs) {
  return (
    <StoryMsal tokens="failing">
      <StoryProviders>
        <div style={width ? { width } : undefined}>
          <MythosCreatureForm
            campaignId="story-campaign"
            mythosCreature={full ? ghoulMythosCreature : bareMythosCreature}
            pending={pending}
            problems={problems}
            failureMessage={failureMessage}
            onSubmit={() => undefined}
            onCancel={() => undefined}
          />
        </div>
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'ScenarioPreparation/MythosCreatureForm',
  component: FormStory,
} satisfies Meta<typeof FormStory>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const FullProfile: Story = { args: { full: true } }
export const Saving: Story = { args: { pending: true } }
export const SaveFailed: Story = { args: { failureMessage: "We couldn't save the Mythos Creature. Try again." } }
export const Narrow320: Story = { args: { full: true, width: 320 } }

export const RefusedSave: Story = {
  args: {
    full: true,
    problems: [
      { path: 'characteristics.values.str', messages: ['Enter STR from 0 to 2,000.'] },
      { path: 'combat.attacks[1].damage', messages: ['Enter the damage, or mark the attack as a manoeuvre.'] },
      { path: 'sanityloss.value', messages: ['Write the Sanity loss as success/failure, for example 0/1D6.'] },
      { path: 'skills', messages: ['Add at most 100 skills.'] },
    ],
  },
}
