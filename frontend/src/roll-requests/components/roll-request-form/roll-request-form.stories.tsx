import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { campaignQueryKeys } from '@/campaign-play/services/campaignApi'
import type { SkillCatalog } from '@/campaign-play/types/RuleData'
import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { RollRequestForm } from './roll-request-form'

const catalog: SkillCatalog = {
  era: '1920s',
  skills: [
    { skill: 'Fighting', specialization: null, base: { kind: 'fixed', value: 25 } },
    { skill: 'Language', specialization: null, base: { kind: 'fixed', value: 1 } },
    { skill: 'Listen', specialization: null, base: { kind: 'fixed', value: 20 } },
    { skill: 'Spot Hidden', specialization: null, base: { kind: 'fixed', value: 25 } },
  ],
  closedFamilies: [
    {
      skill: 'Fighting',
      specializations: [
        { specialization: 'Brawl', base: { kind: 'fixed', value: 25 } },
        { specialization: 'Sword', base: { kind: 'fixed', value: 20 } },
      ],
    },
  ],
  openFamilies: ['Language'],
  specializationSuggestions: { Language: ['Latin'] },
}

const investigators = [
  { id: 'i1', name: 'Harvey Walters' },
  { id: 'i2', name: 'Lucy Ward' },
]

function FormStory() {
  return (
    <StoryMsal tokens="pending">
      <StoryProviders seed={(client) => client.setQueryData(campaignQueryKeys.skills('story-campaign'), catalog)}>
        <RollRequestForm
          campaignId="story-campaign"
          investigators={investigators}
          onRequested={() => undefined}
          onNoActiveScene={() => undefined}
        />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'RollRequests/RollRequestForm',
  component: FormStory,
} satisfies Meta<typeof FormStory>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SpecializationNeeded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox', { name: 'What to roll' }))
    await userEvent.click(canvas.getByRole('option', { name: 'Language' }))
  },
}

export const CheckedRows: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Harvey Walters' }))
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Lucy Ward' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Change Difficulty and dice for Lucy Ward' }))
  },
}

export const Luck: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox', { name: 'What to roll' }))
    await userEvent.click(canvas.getByRole('option', { name: 'Luck' }))
  },
}
