import type { Meta, StoryObj } from '@storybook/react-vite'

import { StoryMsal } from '@/shared/storybook/storyMsal'

import { RequireSignIn } from './require-sign-in'

interface StoryArgs {
  session: 'signedIn' | 'signedOut' | 'resolving'
}

function RequireSignInStory({ session }: StoryArgs) {
  return (
    <StoryMsal session={session}>
      <RequireSignIn heading="Your campaigns">
        <p className="text-sm">Content for a signed-in Account.</p>
      </RequireSignIn>
    </StoryMsal>
  )
}

const meta = {
  title: 'Shared/RequireSignIn',
  component: RequireSignInStory,
} satisfies Meta<typeof RequireSignInStory>

export default meta
type Story = StoryObj<typeof meta>

export const SignedIn: Story = { args: { session: 'signedIn' } }

export const SignedOut: Story = { args: { session: 'signedOut' } }

/** Nothing renders until MSAL settles. */
export const Resolving: Story = { args: { session: 'resolving' } }
