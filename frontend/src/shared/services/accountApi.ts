import { z } from 'zod'

import { apiFetch } from './apiFetch'
import type { Account } from '@/shared/types/Account'

export const accountResponseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
})

export const accountQueryKeys = {
  me: ['account', 'me'] as const,
}

/** Calls GET /api/account/me, which JIT-provisions the caller's Account from their bearer token. */
export async function fetchCurrentAccount(accessToken: string): Promise<Account> {
  const response = await apiFetch('/api/account/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch the current account (${response.status})`)
  }

  return accountResponseSchema.parse(await response.json())
}
