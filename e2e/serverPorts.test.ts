import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { describe, it } from 'node:test'

import { describeOccupiedPorts, findOccupiedPorts } from './serverPorts.ts'

describe('findOccupiedPorts', () => {
  it('reports a bound port and not a free one', async () => {
    const server = createServer()
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const bound = (server.address() as { port: number }).port
    const servers = [
      { name: 'busy', port: bound },
      { name: 'free', port: 1 },
    ]
    try {
      assert.deepEqual(await findOccupiedPorts(servers), [{ name: 'busy', port: bound }])
    } finally {
      server.close()
    }
  })
})

describe('describeOccupiedPorts', () => {
  it('names the server and port and mentions E2E_REUSE_SERVERS=1', () => {
    const message = describeOccupiedPorts([{ name: 'api', port: 5059 }])
    assert.ok(message.includes('api'))
    assert.ok(message.includes('5059'))
    assert.ok(message.includes('E2E_REUSE_SERVERS=1'))
  })
})
