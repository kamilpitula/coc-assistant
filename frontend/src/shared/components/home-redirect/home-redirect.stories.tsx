import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryMsal } from '@/shared/storybook/storyMsal'
import { StoryProviders } from '@/shared/storybook/storyProviders'

import { HomeRedirect } from './home-redirect'

interface StoryArgs {
  session: 'signedOut' | 'resolving'
}

function HomeRedirectStory({ session }: StoryArgs) {
  return (
    <StoryMsal session={session}>
      <StoryProviders>
        <HomeRedirect />
      </StoryProviders>
    </StoryMsal>
  )
}

const meta = {
  title: 'Shared/HomeRedirect',
  component: HomeRedirectStory,
} satisfies Meta<typeof HomeRedirectStory>

export default meta
type Story = StoryObj<typeof meta>

/** Signed out: the home page, unchanged. */
export const SignedOut: Story = { args: { session: 'signedOut' } }

/** MSAL resolving: only the header, so the home page never flashes for a signed-in Account. */
export const Resolving: Story = { args: { session: 'resolving' } }
