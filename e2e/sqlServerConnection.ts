/**
 * Resolves the E2E database connection string. The server comes from COC_SQLSERVER_CONNECTION
 * (e.g. the CI service container) and falls back to LocalDB. Test infrastructure, exempt from unit
 * tests like the fixtures (see docs/e2e/authenticated-harness.md).
 */
const E2E_DATABASE = 'CocAssistantE2E'
const LOCALDB_SERVER = 'Server=(localdb)\\mssqllocaldb;Trusted_Connection=True'

export function resolveE2eConnectionString(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env.COC_SQLSERVER_CONNECTION?.trim().replace(/;+$/, '')
  const server = configured || LOCALDB_SERVER
  return `${server};Database=${E2E_DATABASE};MultipleActiveResultSets=true`
}
