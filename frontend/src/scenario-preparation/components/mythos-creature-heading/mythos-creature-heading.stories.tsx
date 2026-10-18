import type { Meta, StoryObj } from '@storybook/react-vite'

import { MythosCreatureHeading } from './mythos-creature-heading'

const meta = {
  title: 'ScenarioPreparation/MythosCreatureHeading',
  component: MythosCreatureHeading,
  args: { name: 'Ghoul', creatureKind: 'Mythos' },
} satisfies Meta<typeof MythosCreatureHeading>

export default meta
type Story = StoryObj<typeof meta>

export const WithCreatureKind: Story = {}
export const WithoutCreatureKind: Story = { args: { creatureKind: null } }
export const LongName: Story = { args: { name: 'The Thing That Should Not Be, Eater of the Dead Beneath the Old Burying Ground' } }
