/**
 * LocalDB trims itself to a tiny memory-grant target on a machine low on free RAM, which stalls
 * queries on RESOURCE_SEMAPHORE. Global setup raises its `min server memory` floor. See
 * docs/e2e/authenticated-harness.md, "Troubleshooting: slow first request after navigation".
 */

// 900 MB gave a grant target of about 539 MB and a 5 ms first request; it is a floor, not a reservation.
export const LOCALDB_MIN_SERVER_MEMORY_MB = 900

const LOCALDB_SERVER = /^(?:server|data source)\s*=\s*(\(localdb\)\\[^;]+)/i

/** Returns the LocalDB instance a connection string targets, or undefined for any other server. */
export function resolveLocalDbInstance(connectionString: string): string | undefined {
  const firstPart = connectionString.split(';')[0] ?? ''
  return LOCALDB_SERVER.exec(firstPart.trim())?.[1]
}

/** T-SQL that raises `min server memory` to the floor only when it is lower, so reruns do nothing. */
export function buildMinServerMemoryScript(minimumMb: number = LOCALDB_MIN_SERVER_MEMORY_MB): string {
  if (!Number.isInteger(minimumMb) || minimumMb <= 0) {
    throw new Error(`min server memory must be a positive integer, got ${minimumMb}`)
  }
  return [
    `IF (SELECT CAST(value_in_use AS int) FROM sys.configurations WHERE name = 'min server memory (MB)') < ${minimumMb}`,
    'BEGIN',
    "  EXEC sp_configure 'show advanced options', 1; RECONFIGURE;",
    `  EXEC sp_configure 'min server memory (MB)', ${minimumMb}; RECONFIGURE;`,
    'END',
  ].join('\n')
}
