import { accountResponseSchema } from '@/shared/services/accountApi'
import type { Account } from '@/shared/types/Account'

const storedAccountKey = 'cocassistant.account'

/** The last Account returned by GET /api/account/me in this tab; undefined when missing or unreadable. */
export function readStoredAccount(storage: Storage = sessionStorage): Account | undefined {
  try {
    const stored = storage.getItem(storedAccountKey)
    if (stored === null) {
      return undefined
    }
    const parsed = accountResponseSchema.safeParse(JSON.parse(stored))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

/** Remembers the Account so the Header can show its name immediately on the next load in this tab. */
export function storeAccount(account: Account, storage: Storage = sessionStorage): void {
  try {
    storage.setItem(storedAccountKey, JSON.stringify(account))
  } catch {
    // Storage can be unavailable or full; the name then waits for GET /api/account/me.
  }
}

/** Forgets the stored Account, as part of Sign Out. */
export function clearStoredAccount(storage: Storage = sessionStorage): void {
  try {
    storage.removeItem(storedAccountKey)
  } catch {
    // Nothing stored that can be read back either.
  }
}
