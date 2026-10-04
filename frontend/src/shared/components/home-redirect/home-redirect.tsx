import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { Header } from '@/shared/components/header/header'
import { HomePage } from '@/shared/components/home-page/home-page'
import { useAuthStatus } from '@/shared/hooks/useAuthStatus'

/**
 * The `/` route: the home page for signed-out visitors, and a history-replacing redirect to Campaigns for a signed-in
 * Account. Until MSAL settles only the header renders, so the home page never flashes (specs/campaign-list/ux.md
 * section 5).
 */
export function HomeRedirect() {
  const authStatus = useAuthStatus()
  const navigate = useNavigate()

  useEffect(() => {
    if (authStatus === 'signedIn') {
      void navigate({ to: '/campaigns', replace: true })
    }
  }, [authStatus, navigate])

  if (authStatus === 'signedOut') {
    return <HomePage />
  }
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
    </div>
  )
}
