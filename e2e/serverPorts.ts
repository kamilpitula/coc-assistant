/**
 * Occupied-port check for the E2E wrapper. Probes 127.0.0.1 and ::1, the same probe
 * Playwright uses for readiness, so the result matches `reuseExistingServer` semantics.
 * A listen-based probe was rejected: a wildcard bind on Windows can hide the conflict.
 */
import { connect } from 'node:net'

import type { E2eServer } from './e2eServers.ts'

function probeOnce(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host })
    socket.setTimeout(timeoutMs)
    const finish = (value: boolean): void => {
      socket.removeAllListeners('connect')
      socket.removeAllListeners('timeout')
      socket.removeAllListeners('error')
      socket.on('error', () => {})
      socket.destroy()
      resolve(value)
    }
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

/** True when either loopback address accepts a connection on the port. */
export function isPortInUse(port: number, timeoutMs = 500): Promise<boolean> {
  return Promise.all([probeOnce('127.0.0.1', port, timeoutMs), probeOnce('::1', port, timeoutMs)]).then(
    (results) => results.some(Boolean),
  )
}

/** The subset of servers whose port is already taken. */
export async function findOccupiedPorts(
  servers: readonly E2eServer[],
  probe: (port: number) => Promise<boolean> = isPortInUse,
): Promise<E2eServer[]> {
  const occupied: E2eServer[] = []
  for (const server of servers) {
    if (await probe(server.port)) {
      occupied.push(server)
    }
  }
  return occupied
}

/** One refusal line per port, plus the reuse hint. */
export function describeOccupiedPorts(occupied: readonly E2eServer[]): string {
  const lines = occupied.map((server) => `Port ${server.port} (${server.name}) is already in use.`)
  lines.push(
    'Either stop the process using it, or reuse the running servers with E2E_REUSE_SERVERS=1 (they must match this checkout).',
  )
  return lines.join('\n')
}
