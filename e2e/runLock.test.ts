import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { acquireRunLock, isProcessAlive, releaseRunLock } from './runLock.ts'

function lockPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'e2e-lock-test-')), 'run.lock')
}

describe('acquireRunLock', () => {
  it('acquires when no lock exists and records pid, checkout, and start time', () => {
    const path = lockPath()
    const result = acquireRunLock({
      path,
      pid: 4242,
      checkout: 'C:/repo',
      startedAt: '2026-11-07T00:00:00.000Z',
      isAlive: () => false,
    })
    assert.equal(result.acquired, true)
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf-8')), {
      pid: 4242,
      checkout: 'C:/repo',
      startedAt: '2026-11-07T00:00:00.000Z',
    })
  })

  it('refuses when the owner is alive and names the pid, checkout, and lock path', () => {
    const path = lockPath()
    writeFileSync(path, JSON.stringify({ pid: 111, checkout: 'C:/other', startedAt: 'then' }))
    const result = acquireRunLock({ path, pid: 222, checkout: 'C:/repo', isAlive: () => true })
    assert.equal(result.acquired, false)
    if (!result.acquired) {
      assert.ok(result.message.includes('111'))
      assert.ok(result.message.includes('C:/other'))
      assert.ok(result.message.includes(path))
    }
  })

  it('clears a stale lock when the owner is dead', () => {
    const path = lockPath()
    writeFileSync(path, JSON.stringify({ pid: 111, checkout: 'C:/old', startedAt: 'then' }))
    const result = acquireRunLock({ path, pid: 222, checkout: 'C:/repo', isAlive: () => false })
    assert.equal(result.acquired, true)
    assert.equal(JSON.parse(readFileSync(path, 'utf-8')).pid, 222)
  })

  it('treats corrupt JSON as stale', () => {
    const path = lockPath()
    writeFileSync(path, 'not json')
    const result = acquireRunLock({ path, pid: 222, checkout: 'C:/repo', isAlive: () => true })
    assert.equal(result.acquired, true)
  })
})

describe('releaseRunLock', () => {
  it('removes the file when it holds our pid', () => {
    const path = lockPath()
    acquireRunLock({ path, pid: 222, checkout: 'C:/repo', isAlive: () => true })
    releaseRunLock(path, 222)
    assert.throws(() => readFileSync(path, 'utf-8'))
  })

  it('leaves the file when another pid holds it', () => {
    const path = lockPath()
    acquireRunLock({ path, pid: 111, checkout: 'C:/other', isAlive: () => true })
    releaseRunLock(path, 222)
    assert.equal(JSON.parse(readFileSync(path, 'utf-8')).pid, 111)
  })
})

describe('isProcessAlive', () => {
  it('is true for this process and false for a pid that cannot exist', () => {
    assert.equal(isProcessAlive(process.pid), true)
    assert.equal(isProcessAlive(2147483647), false)
  })
})
