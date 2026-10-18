import type { Meta, StoryObj } from '@storybook/react-vite'

import { ProfileSection } from './profile-section'

const meta = {
  title: 'ScenarioPreparation/ProfileSection',
  component: ProfileSection,
  args: { title: 'Skills', mode: 'edit', children: <p className="text-sm">Section content</p> },
} satisfies Meta<typeof ProfileSection>

export default meta
type Story = StoryObj<typeof meta>

export const ViewWithValues: Story = { args: { mode: 'view' } }
export const EditWithRemove: Story = { args: { onRemove: () => undefined } }
export const EditAlwaysPresent: Story = { args: { title: 'Details' } }
