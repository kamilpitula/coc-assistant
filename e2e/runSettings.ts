/**
 * Small `npm test` settings for the E2E wrapper (`e2e/runE2e.ts`). Pure functions with an
 * injectable env, in the style of `e2e/sqlServerConnection.ts`.
 */

/** Worker count from `E2E_WORKERS`: a positive integer, 1 locally and 2 on CI by default. */
export function resolveWorkerCount(env: Record<string, string | undefined> = process.env): number {
  const raw = env.E2E_WORKERS?.trim()
  if (!raw) {
    return env.CI ? 2 : 1
  }
  if (!/^\d+$/.test(raw) || Number(raw) < 1) {
    throw new Error(`E2E_WORKERS must be a positive integer, got ${JSON.stringify(env.E2E_WORKERS)}`)
  }
  return Number(raw)
}

/** Server reuse from `E2E_REUSE_SERVERS`: only `"1"`, and never on CI (local-only opt-in). */
export function resolveReuseServers(env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.E2E_REUSE_SERVERS
  if (raw === undefined || raw === '' || raw === '0') {
    return false
  }
  if (raw === '1') {
    return !env.CI
  }
  throw new Error(`E2E_REUSE_SERVERS must be "1" or "0", got ${JSON.stringify(raw)}`)
}
