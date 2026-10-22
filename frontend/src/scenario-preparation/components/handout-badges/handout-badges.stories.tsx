import type { Meta, StoryObj } from '@storybook/react-vite'

import { HandoutBadges } from './handout-badges'

const meta = {
  title: 'ScenarioPreparation/HandoutBadges',
  component: HandoutBadges,
  args: { kind: 'ReadAloud', visibility: 'PlayerFacing' },
} satisfies Meta<typeof HandoutBadges>

export default meta
type Story = StoryObj<typeof meta>

export const ReadAloudPlayerFacing: Story = {}

export const ReadAloudKeeperFacing: Story = { args: { visibility: 'KeeperFacing' } }

export const TextPlayerFacing: Story = { args: { kind: 'Text' } }

export const TextKeeperFacing: Story = { args: { kind: 'Text', visibility: 'KeeperFacing' } }
