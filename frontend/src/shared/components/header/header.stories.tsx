import type { Meta, StoryObj } from '@storybook/react-vite'
import { InteractionStatus, Logger } from '@azure/msal-browser'
import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser'
import { MsalContext } from '@azure/msal-react'
import type { ReactNode } from 'react'

import { StoryProviders } from '@/shared/storybook/storyProviders'
import { accountQueryKeys } from '@/shared/services/accountApi'
import type { Account } from '@/shared/types/Account'

import { Header } from './header'

const signedInAccount = { homeAccountId: 'story-account', localAccountId: 'story-account', username: 'keeper' } as AccountInfo

// A stand-in MSAL instance whose token requests never settle, so stories never call the API.
const storyInstance = {
  acquireTokenSilent: () => new Promise(() => {}),
  loginRedirect: () => Promise.resolve(),
  logoutRedirect: () => Promise.resolve(),
} as unknown as IPublicClientApplication

function MsalStory({ inProgress, accounts, account, children }: {
  inProgress: InteractionStatus
  accounts: AccountInfo[]
  account?: Account
  children: ReactNode
}) {
  return (
    <MsalContext.Provider value={{ instance: storyInstance, inProgress, accounts, logger: new Logger({}) }}>
      <StoryProviders seed={(client) => account && client.setQueryData(accountQueryKeys.me, account)}>{children}</StoryProviders>
    </MsalContext.Provider>
  )
}

const meta = {
  title: 'Shared/Header',
  component: Header,
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const SignedOut: Story = {
  decorators: [(Story) => <MsalStory inProgress={InteractionStatus.None} accounts={[]}><Story /></MsalStory>],
}

/** MSAL is still starting up: nothing for 400 ms, then the skeleton (ux.md section 2). */
export const Resolving: Story = {
  decorators: [(Story) => <MsalStory inProgress={InteractionStatus.Startup} accounts={[]}><Story /></MsalStory>],
}

export const SignedIn: Story = {
  decorators: [
    (Story) => (
      <MsalStory
        inProgress={InteractionStatus.None}
        accounts={[signedInAccount]}
        account={{ id: '1', displayName: 'Eleanor Hart', email: 'eleanor@example.com' }}
      >
        <Story />
      </MsalStory>
    ),
  ],
}

/** Signed in for the first time in this tab: the name waits for GET /api/account/me. */
export const SignedInNameLoading: Story = {
  decorators: [(Story) => <MsalStory inProgress={InteractionStatus.None} accounts={[signedInAccount]}><Story /></MsalStory>],
}

/** The Account has no display name yet: Campaigns and Sign Out only. */
export const SignedInWithoutName: Story = {
  decorators: [
    (Story) => (
      <MsalStory
        inProgress={InteractionStatus.None}
        accounts={[signedInAccount]}
        account={{ id: '1', displayName: '', email: '' }}
      >
        <Story />
      </MsalStory>
    ),
  ],
}
