import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveReuseServers, resolveWorkerCount } from './runSettings.ts'

describe('resolveWorkerCount', () => {
  it('defaults to 1 locally', () => {
    assert.equal(resolveWorkerCount({}), 1)
  })

  it('defaults to 2 on CI', () => {
    assert.equal(resolveWorkerCount({ CI: 'true' }), 2)
  })

  it('treats empty or whitespace as unset', () => {
    assert.equal(resolveWorkerCount({ E2E_WORKERS: '' }), 1)
    assert.equal(resolveWorkerCount({ E2E_WORKERS: '   ', CI: 'true' }), 2)
  })

  it('uses a positive integer value', () => {
    assert.equal(resolveWorkerCount({ E2E_WORKERS: '3' }), 3)
  })

  it('throws on zero, negative, decimal, suffixed, or text values', () => {
    for (const value of ['0', '-1', '1.5', '50%', 'abc']) {
      assert.throws(() => resolveWorkerCount({ E2E_WORKERS: value }), /E2E_WORKERS/)
    }
  })
})

describe('resolveReuseServers', () => {
  it('is true for "1" locally', () => {
    assert.equal(resolveReuseServers({ E2E_REUSE_SERVERS: '1' }), true)
  })

  it('is false for "1" on CI', () => {
    assert.equal(resolveReuseServers({ E2E_REUSE_SERVERS: '1', CI: 'true' }), false)
  })

  it('is false when unset, empty, or "0"', () => {
    assert.equal(resolveReuseServers({}), false)
    assert.equal(resolveReuseServers({ E2E_REUSE_SERVERS: '' }), false)
    assert.equal(resolveReuseServers({ E2E_REUSE_SERVERS: '0' }), false)
  })

  it('throws on any other value', () => {
    assert.throws(() => resolveReuseServers({ E2E_REUSE_SERVERS: 'true' }))
  })
})
