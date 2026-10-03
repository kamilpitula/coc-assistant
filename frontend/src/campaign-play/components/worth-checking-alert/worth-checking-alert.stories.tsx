import type { Meta, StoryObj } from '@storybook/react-vite'

import { problem } from '@/campaign-play/test-support/characterSheetFixtures'

import { WorthCheckingAlert } from './worth-checking-alert'

const meta = {
  title: 'CampaignPlay/WorthCheckingAlert',
  component: WorthCheckingAlert,
} satisfies Meta<typeof WorthCheckingAlert>

export default meta
type Story = StoryObj<typeof meta>

export const PointBuyWarnings: Story = {
  args: {
    warnings: [
      problem('PointBuyBelowRecommendation', 'characteristics.INT', 'INT is below the recommended 40. Check with your Keeper.', 'Warning'),
      problem('PointBuyBelowRecommendation', 'characteristics.SIZ', 'SIZ is below the recommended 40. Check with your Keeper.', 'Warning'),
    ],
  },
}
