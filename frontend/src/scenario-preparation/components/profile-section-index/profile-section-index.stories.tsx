import type { Meta, StoryObj } from '@storybook/react-vite'

import { SECTION_ORDER, sectionIndexEntries } from '@/scenario-preparation/services/mythosCreatureSections'

import { ProfileSectionIndex } from './profile-section-index'

const meta = {
  title: 'ScenarioPreparation/ProfileSectionIndex',
  component: ProfileSectionIndex,
  args: { sections: sectionIndexEntries(['characteristics', 'combat']) },
} satisfies Meta<typeof ProfileSectionIndex>

export default meta
type Story = StoryObj<typeof meta>

export const FewSections: Story = {}
export const AllSections: Story = { args: { sections: sectionIndexEntries(SECTION_ORDER) } }
export const At320px: Story = {
  args: { sections: sectionIndexEntries(SECTION_ORDER) },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
}
