/**
 * Machine-wide single-run lock for E2E. The lock file lives in the OS temp directory (not the
 * checkout) because the ports are machine-wide and overlapping runs come from different
 * worktrees. Acquired with atomic `wx` creation; a lock whose owner is gone is stale and cleared.
 */
import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from 'node:fs'

export interface RunLockInfo {
  pid: number
  checkout: string
  startedAt: string
}

export type AcquireRunLockResult =
  | { acquired: true; info: RunLockInfo }
  | { acquired: false; message: string }

export interface AcquireRunLockOptions {
  path: string
  pid: number
  checkout: string
  startedAt?: string
  isAlive?: (pid: number) => boolean
}

/** True when a process with the pid exists. `EPERM` means alive; only `ESRCH` means dead. */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code !== 'ESRCH'
  }
}

function readLock(path: string): RunLockInfo | undefined {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<RunLockInfo>
    if (typeof parsed.pid !== 'number' || typeof parsed.checkout !== 'string') {
      return undefined
    }
    return parsed as RunLockInfo
  } catch {
    return undefined
  }
}

function refuse(path: string, owner: RunLockInfo): AcquireRunLockResult {
  return {
    acquired: false,
    message:
      `Another E2E run is already active (pid ${owner.pid}, checkout ${owner.checkout}, ` +
      `started ${owner.startedAt}). If that pid is not actually an E2E run, delete ${path} and retry.`,
  }
}

export function acquireRunLock(options: AcquireRunLockOptions): AcquireRunLockResult {
  const startedAt = options.startedAt ?? new Date().toISOString()
  const isAlive = options.isAlive ?? isProcessAlive
  const writeMine = (): AcquireRunLockResult => {
    const info: RunLockInfo = { pid: options.pid, checkout: options.checkout, startedAt }
    const fd = openSync(options.path, 'wx')
    try {
      writeSync(fd, JSON.stringify(info))
    } finally {
      closeSync(fd)
    }
    return { acquired: true, info }
  }

  try {
    return writeMine()
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') {
      throw error
    }
  }

  const owner = readLock(options.path)
  if (owner && isAlive(owner.pid)) {
    return refuse(options.path, owner)
  }
  try {
    unlinkSync(options.path)
  } catch {
    // Another run cleared or replaced it; the retry below decides.
  }
  try {
    return writeMine()
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'EEXIST') {
      const rival = readLock(options.path)
      return rival ? refuse(options.path, rival) : writeMine()
    }
    throw error
  }
}

/** Removes the lock only when it still holds our pid, so we never clear another run. */
export function releaseRunLock(path: string, pid: number): void {
  if (readLock(path)?.pid === pid) {
    try {
      unlinkSync(path)
    } catch {
      // Already gone; nothing to release.
    }
  }
}
