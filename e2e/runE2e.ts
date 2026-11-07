/**
 * The only supported entry point for an E2E run (`npm test -- <args>` in `e2e/`). Holds the
 * machine-wide single-run lock, clears a leftover mock container, refuses occupied ports, and
 * then starts Playwright with the lock path in the child's env. Thin wiring only; the decisions
 * live in the helpers it calls.
 */
import { spawn, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { E2E_SERVERS } from './e2eServers.ts'
import { acquireRunLock, releaseRunLock } from './runLock.ts'
import { resolveReuseServers } from './runSettings.ts'
import { describeOccupiedPorts, findOccupiedPorts } from './serverPorts.ts'

const E2E_DIR = dirname(fileURLToPath(import.meta.url))
const LOCK_PATH = join(tmpdir(), 'coc-assistant-e2e-run.lock')
const PLAYWRIGHT_CLI = join(E2E_DIR, 'node_modules', '@playwright', 'test', 'cli.js')

function dockerComposeDown(): void {
  spawnSync('docker', ['compose', '-f', 'docker/docker-compose.e2e.yml', 'down'], {
    cwd: E2E_DIR,
    stdio: 'inherit',
  })
}

function runPlaywright(args: string[]): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [PLAYWRIGHT_CLI, 'test', ...args], {
      stdio: 'inherit',
      env: { ...process.env, COC_E2E_RUN_LOCK: LOCK_PATH },
    })
    child.on('error', reject)
    child.on('close', (code, signal) => resolvePromise(signal ? 1 : (code ?? 1)))
  })
}

async function main(): Promise<number> {
  const checkout = resolve(E2E_DIR, '..')
  const reuse = resolveReuseServers()
  const lock = acquireRunLock({ path: LOCK_PATH, pid: process.pid, checkout })
  if (!lock.acquired) {
    console.error(lock.message)
    return 1
  }
  try {
    if (!reuse) {
      dockerComposeDown()
      const occupied = await findOccupiedPorts(E2E_SERVERS)
      if (occupied.length > 0) {
        console.error(describeOccupiedPorts(occupied))
        return 1
      }
    }
    return await runPlaywright(process.argv.slice(2))
  } finally {
    if (!reuse) {
      dockerComposeDown()
    }
    releaseRunLock(LOCK_PATH, process.pid)
  }
}

// The terminal delivers Ctrl+C to the Playwright child itself; the wrapper must not exit first.
process.on('SIGINT', () => {})
process.exitCode = await main()
