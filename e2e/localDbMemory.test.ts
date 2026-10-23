import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  LOCALDB_MIN_SERVER_MEMORY_MB,
  buildMinServerMemoryScript,
  resolveLocalDbInstance,
} from './localDbMemory.ts'

describe('resolveLocalDbInstance', () => {
  it('returns the LocalDB server for the default E2E connection string', () => {
    const connection = 'Server=(localdb)\\mssqllocaldb;Trusted_Connection=True;Database=CocAssistantE2E'
    assert.equal(resolveLocalDbInstance(connection), '(localdb)\\mssqllocaldb')
  })

  it('accepts Data Source and any letter case', () => {
    assert.equal(resolveLocalDbInstance('data source=(LocalDB)\\MSSQLLocalDB;Database=x'), '(LocalDB)\\MSSQLLocalDB')
  })

  it('returns undefined for a TCP server such as the CI container', () => {
    const connection = 'Server=localhost,1433;User Id=sa;Password=p;Database=CocAssistantE2E'
    assert.equal(resolveLocalDbInstance(connection), undefined)
  })

  it('returns undefined when a password merely mentions localdb', () => {
    assert.equal(resolveLocalDbInstance('Server=db1;Password=Server=(localdb)\\x'), undefined)
  })
})

describe('buildMinServerMemoryScript', () => {
  it('raises the floor only when the configured value is lower', () => {
    const script = buildMinServerMemoryScript(900)
    assert.ok(script.includes(') < 900'))
    assert.ok(script.includes("sp_configure 'min server memory (MB)', 900"))
  })

  it('uses the named constant value by default', () => {
    assert.ok(buildMinServerMemoryScript().includes(`< ${LOCALDB_MIN_SERVER_MEMORY_MB}`))
  })

  it('rejects a non-positive or non-integer value', () => {
    assert.throws(() => buildMinServerMemoryScript(0))
    assert.throws(() => buildMinServerMemoryScript(1.5))
  })
})
