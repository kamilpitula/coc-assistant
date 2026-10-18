import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'
import { gangsterHumanNpc, knottHumanNpc } from '@/scenario-preparation/test-support/humanNpcFixtures'
import type { ValidationProblem } from '@/scenario-preparation/types/ValidationProblem'

import { HumanNpcForm } from './human-npc-form'

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
          <HumanNpcForm
            campaignId="story-campaign"
            humanNpc={full ? gangsterHumanNpc : knottHumanNpc}
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
  title: 'ScenarioPreparation/HumanNpcForm',
  component: FormStory,
} satisfies Meta<typeof FormStory>

export default meta
type Story = StoryObj<typeof meta>

export const NarrativeOnly: Story = {}
export const FullProfile: Story = { args: { full: true } }
export const Saving: Story = { args: { pending: true } }
export const SaveFailed: Story = { args: { failureMessage: "We couldn't save the Human NPC. Try again." } }
export const Narrow320: Story = { args: { full: true, width: 320 } }

export const RefusedSave: Story = {
  args: {
    full: true,
    problems: [
      { path: 'characteristics.str', messages: ['Enter STR from 0 to 100.'] },
      { path: 'combat.weapons[1].range', messages: ['Range must be 1,000 characters or fewer.'] },
      { path: 'skills[0].value', messages: ['Enter a value from 0 to 100.'] },
    ],
  },
}

export const AddASection: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Add Combat' }))
  },
}
