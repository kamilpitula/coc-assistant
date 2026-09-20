import { LogIn, LogOut, UserPlus } from 'lucide-react'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'

import { Button } from '@/shared/components/ui/button'
import { apiScope } from '@/shared/services/msalConfig'
import { useAccountSync } from '@/shared/hooks/useAccountSync'

export function Header() {
  const isAuthenticated = useIsAuthenticated()
  const { instance } = useMsal()
  const { data: account } = useAccountSync()

  const signIn = () => instance.loginRedirect({ scopes: [apiScope] })
  const signOut = () => instance.logoutRedirect()

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <span className="text-lg font-semibold">CoC Assistant</span>
      <div className="flex items-center gap-3">
        {isAuthenticated && account ? (
          <>
            <span className="text-sm font-medium">{account.displayName}</span>
            <Button variant="outline" onClick={signOut}>
              <LogOut aria-hidden="true" />
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={signIn}>
              <LogIn aria-hidden="true" />
              Sign In
            </Button>
            <Button onClick={signIn}>
              <UserPlus aria-hidden="true" />
              Sign Up
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
