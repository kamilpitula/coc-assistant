import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { useQuery } from '@tanstack/react-query'

import { accountQueryKeys, fetchCurrentAccount } from '@/shared/services/accountApi'
import { apiScope } from '@/shared/services/msalConfig'

/** Calls GET /api/account/me right after sign-in to JIT-provision the Account and confirm the auth pipeline works. */
export function useAccountSync() {
  const isAuthenticated = useIsAuthenticated()
  const { instance, accounts } = useMsal()
  const activeAccount = accounts[0]

  return useQuery({
    queryKey: accountQueryKeys.me,
    queryFn: async () => {
      const result = await instance.acquireTokenSilent({
        scopes: [apiScope],
        account: activeAccount,
      })
      return fetchCurrentAccount(result.accessToken)
    },
    enabled: isAuthenticated && activeAccount !== undefined,
  })
}
