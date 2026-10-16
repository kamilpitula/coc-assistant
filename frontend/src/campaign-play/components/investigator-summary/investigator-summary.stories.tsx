import type { Meta, StoryObj } from '@storybook/react-vite'

import { InvestigatorSummary } from './investigator-summary'

const meta = {
  title: 'CampaignPlay/InvestigatorSummary',
  component: InvestigatorSummary,
  args: { onShowProblems: () => {} },
} satisfies Meta<typeof InvestigatorSummary>

export default meta
type Story = StoryObj<typeof meta>

export const Calculated: Story = {
  args: {
    problemCount: 0,
    derived: {
      luck: 55,
      idea: 60,
      know: 50,
      hitPoints: 12,
      magicPoints: 12,
      sanity: { current: 60, maximum: 99 },
      dodge: 30,
      movementRate: 8,
      damageBonus: '0',
      build: 0,
      occupationPoints: null,
      personalInterestPoints: null,
      creditRating: null,
      wealth: null,
    },
  },
}

export const NotYetCalculatedWithProblems: Story = {
  args: {
    problemCount: 2,
    derived: {
      luck: null,
      idea: null,
      know: null,
      hitPoints: null,
      magicPoints: null,
      sanity: { current: null, maximum: null },
      dodge: null,
      movementRate: null,
      damageBonus: null,
      build: null,
      occupationPoints: null,
      personalInterestPoints: null,
      creditRating: null,
      wealth: null,
    },
  },
}
