import { InteractionStatus } from '@azure/msal-browser'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'

/** Whether MSAL is still resolving the session, or has settled signed in or signed out. */
export type AuthStatus = 'resolving' | 'signedIn' | 'signedOut'

/** The signed-in state of the browser session; resolving while MSAL starts up, so nothing renders for the wrong state. */
export function useAuthStatus(): AuthStatus {
  const isAuthenticated = useIsAuthenticated()
  const { inProgress } = useMsal()

  if (inProgress === InteractionStatus.Startup) {
    return 'resolving'
  }
  return isAuthenticated ? 'signedIn' : 'signedOut'
}
