import { LogIn, LogOut, UserPlus } from 'lucide-react'
import { InteractionStatus } from '@azure/msal-browser'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'

import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { apiScope } from '@/shared/services/msalConfig'
import { clearStoredAccount } from '@/shared/services/storedAccount'
import { useAccountSync } from '@/shared/hooks/useAccountSync'
import { useDelayedFlag } from '@/shared/hooks/useDelayedFlag'
import type { Account } from '@/shared/types/Account'

/** How long MSAL may resolve before the auth slot shows a skeleton (ux.md section 2). */
export const slowResolvingDelayMs = 400

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <span className="text-lg font-semibold">CoC Assistant</span>
      <AuthSlot />
    </header>
  )
}

function AuthSlot() {
  const isAuthenticated = useIsAuthenticated()
  const { instance, inProgress } = useMsal()
  const { data: account, isError: accountSyncFailed } = useAccountSync()
  const isResolving = inProgress === InteractionStatus.Startup
  const isSlow = useDelayedFlag(isResolving, slowResolvingDelayMs)

  const signIn = () => instance.loginRedirect({ scopes: [apiScope] })
  const signOut = () => {
    clearStoredAccount()
    instance.logoutRedirect()
  }

  if (isResolving) {
    return <ResolvingSlot isSlow={isSlow} />
  }
  if (isAuthenticated && accountSyncFailed) {
    return <AccountUnavailableSlot onSignOut={signOut} />
  }
  if (isAuthenticated) {
    return <SignedInSlot account={account} onSignOut={signOut} />
  }
  return <SignedOutSlot onSignIn={signIn} />
}

function ResolvingSlot({ isSlow }: { isSlow: boolean }) {
  return (
    <div aria-busy="true" className="flex min-h-9 items-center gap-3">
      {isSlow && (
        <>
          <Skeleton data-testid="auth-skeleton" aria-hidden="true" className="h-5 w-24" />
          <Skeleton data-testid="auth-skeleton" aria-hidden="true" className="h-9 w-24" />
        </>
      )}
    </div>
  )
}

function SignedInSlot({ account, onSignOut }: { account: Account | undefined; onSignOut: () => void }) {
  return (
    <div className="flex min-h-9 items-center gap-3">
      <a href="/campaigns" className={buttonVariants({ variant: 'link' })}>
        Campaigns
      </a>
      {account === undefined ? (
        <Skeleton data-testid="account-name-skeleton" aria-hidden="true" className="h-5 w-24" />
      ) : (
        account.displayName && <span className="text-sm font-medium">{account.displayName}</span>
      )}
      <SignOutButton onSignOut={onSignOut} />
    </div>
  )
}

function AccountUnavailableSlot({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="flex min-h-9 items-center gap-3">
      <span role="status" className="text-sm text-destructive">
        Account unavailable
      </span>
      <SignOutButton onSignOut={onSignOut} />
    </div>
  )
}

function SignedOutSlot({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="flex min-h-9 items-center gap-3">
      <Button variant="outline" onClick={onSignIn}>
        <LogIn aria-hidden="true" />
        Sign In
      </Button>
      <Button onClick={onSignIn}>
        <UserPlus aria-hidden="true" />
        Sign Up
      </Button>
    </div>
  )
}

function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <Button variant="outline" onClick={onSignOut}>
      <LogOut aria-hidden="true" />
      Sign Out
    </Button>
  )
}
