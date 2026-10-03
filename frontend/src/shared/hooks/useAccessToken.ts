import { useMsal } from '@azure/msal-react'
import { useCallback } from 'react'

import { apiScope } from '@/shared/services/msalConfig'

/** Returns a function that silently acquires an API access token for the signed-in account. */
export function useAccessToken(): () => Promise<string> {
  const { instance, accounts } = useMsal()
  const activeAccount = accounts[0]

  return useCallback(async () => {
    const result = await instance.acquireTokenSilent({ scopes: [apiScope], account: activeAccount })
    return result.accessToken
  }, [instance, activeAccount])
}
