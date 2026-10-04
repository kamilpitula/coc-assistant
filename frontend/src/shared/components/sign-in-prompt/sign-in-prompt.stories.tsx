import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryMsal } from '@/shared/storybook/storyMsal'

import { SignInPrompt } from './sign-in-prompt'

const meta = {
  title: 'Shared/SignInPrompt',
  component: SignInPrompt,
  decorators: [(Story) => <StoryMsal session="signedOut"><Story /></StoryMsal>],
} satisfies Meta<typeof SignInPrompt>

export default meta
type Story = StoryObj<typeof meta>

export const CampaignList: Story = { args: { heading: 'Your campaigns' } }

export const NewCampaign: Story = { args: { heading: 'New campaign' } }
