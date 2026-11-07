/**
 * The E2E servers and their ports, defined once and shared by `playwright.config.ts`
 * (readiness probes) and the `npm test` wrapper (occupied-port check).
 */

export interface E2eServer {
  name: string
  port: number
}

export const E2E_SERVERS: readonly E2eServer[] = [
  { name: 'mock-oauth2', port: 8443 },
  { name: 'api', port: 5059 },
  { name: 'vite', port: 5174 },
]

export function e2ePort(name: string): number {
  const server = E2E_SERVERS.find((entry) => entry.name === name)
  if (!server) {
    throw new Error(`Unknown E2E server ${JSON.stringify(name)}`)
  }
  return server.port
}
