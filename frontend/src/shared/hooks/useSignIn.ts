import { useMsal } from '@azure/msal-react'

import { apiScope } from '@/shared/services/msalConfig'

/** Returns a function that starts the Entra ID sign-in redirect for the API scope. */
export function useSignIn(): () => Promise<void> {
  const { instance } = useMsal()
  return () => instance.loginRedirect({ scopes: [apiScope] })
}
