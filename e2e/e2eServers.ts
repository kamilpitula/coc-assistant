/**
 * The E2E servers and their ports, defined once and shared by `playwright.config.ts`
 * (readiness probes) and the `npm test` wrapper (occupied-port check).
 */

export interface E2eServer {
  name: string
  port: number
}

export const E2E_SERVERS = [
  { name: 'mock-oauth2', port: 8443 },
  { name: 'api', port: 5059 },
  { name: 'vite', port: 5174 },
] as const

/** Server names, derived from the table so a typo fails at type-check. */
export type E2eServerName = (typeof E2E_SERVERS)[number]['name']

export function e2ePort(name: E2eServerName): number {
  const server = E2E_SERVERS.find((entry) => entry.name === name)
  if (!server) {
    throw new Error(`Unknown E2E server ${JSON.stringify(name)}`)
  }
  return server.port
}
