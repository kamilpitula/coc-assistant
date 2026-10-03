import type { Meta, StoryObj } from '@storybook/react-vite'

import { InvestigatorStatusBadge } from './investigator-status-badge'

const meta = {
  title: 'CampaignPlay/InvestigatorStatusBadge',
  component: InvestigatorStatusBadge,
} satisfies Meta<typeof InvestigatorStatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const PlayerSubmitted: Story = { args: { status: 'Submitted', audience: 'Player' } }

export const PlayerApproved: Story = { args: { status: 'Approved', audience: 'Player' } }

export const KeeperInProgress: Story = { args: { status: 'Draft', audience: 'Keeper' } }

export const KeeperChangesRequested: Story = { args: { status: 'ChangesRequested', audience: 'Keeper' } }
