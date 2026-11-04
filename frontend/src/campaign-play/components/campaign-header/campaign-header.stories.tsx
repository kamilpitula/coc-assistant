import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryProviders } from '@/shared/storybook/storyProviders'

import { CampaignHeader } from './campaign-header'

const campaign = { id: 'story-campaign', name: 'Haunting of Corbitt House', era: '1920s' as const }

const meta = {
  title: 'CampaignPlay/CampaignHeader',
  component: CampaignHeader,
  decorators: [
    (Story) => (
      <StoryProviders>
        <Story />
      </StoryProviders>
    ),
  ],
} satisfies Meta<typeof CampaignHeader>

export default meta
type Story = StoryObj<typeof meta>

export const KeeperOnOverview: Story = {
  args: { campaign: { ...campaign, role: 'Keeper' }, section: 'overview', isOverview: true, hasActiveScene: false },
}

export const KeeperOnSettings: Story = {
  args: { campaign: { ...campaign, role: 'Keeper' }, section: 'settings', isOverview: false, hasActiveScene: false },
}

export const PlayerOnOverview: Story = {
  args: { campaign: { ...campaign, role: 'Player' }, section: 'overview', isOverview: true, hasActiveScene: false },
}

/** On a sheet, wizard, or review page the name is plain text and Overview stays current (CO-UX-11). */
export const PlayerOnWizard: Story = {
  args: { campaign: { ...campaign, role: 'Player' }, section: 'overview', isOverview: false, hasActiveScene: false },
}

/** While a Scene is Active the Active Scene tab shows "Live" (NAV-UX-3). */
export const KeeperOnActiveSceneLive: Story = {
  args: { campaign: { ...campaign, role: 'Keeper' }, section: 'active-scene', isOverview: false, hasActiveScene: true },
}

export const PlayerOnWallLive: Story = {
  args: { campaign: { ...campaign, role: 'Player' }, section: 'wall', isOverview: false, hasActiveScene: true },
}

export const LongNameAtNarrowWidth: Story = {
  args: {
    campaign: { ...campaign, name: 'The Unspeakable Haunting of Corbitt House and the Whispering Lighthouse', role: 'Keeper' },
    section: 'overview',
    isOverview: true,
    hasActiveScene: false,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
}

/** At 320px the tab row scrolls inside itself and the current tab stays visible (NAV-A11Y-4). */
export const NarrowWithLive: Story = {
  args: {
    campaign: { ...campaign, role: 'Keeper' },
    section: 'wall',
    isOverview: false,
    hasActiveScene: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
}
