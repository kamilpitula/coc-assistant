import { describe, expect, it, vi } from 'vitest'

import { createLiveConnection, type LiveConnectionState, type LiveHubConnection } from './liveConnection'

// specs/campaign-play/spec.md, Live connection contract: automatic reconnect, the failed state with "Try again", and
// reconnecting after the server closes the connection (an expired token).

function fakeHubConnection() {
  const reconnecting: Array<() => void> = []
  const reconnected: Array<() => void> = []
  const closed: Array<(error?: Error) => void> = []
  const hub = {
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => closed.forEach((callback) => callback())),
    invoke: vi.fn(async () => 'result'),
    on: vi.fn(),
    onreconnecting: (callback: () => void) => reconnecting.push(callback),
    onreconnected: (callback: () => void) => reconnected.push(callback),
    onclose: (callback: (error?: Error) => void) => closed.push(callback),
  } satisfies LiveHubConnection
  return {
    hub,
    loseConnection: () => reconnecting.forEach((callback) => callback()),
    restoreConnection: () => reconnected.forEach((callback) => callback()),
    close: (error?: Error) => closed.forEach((callback) => callback(error)),
  }
}

function setup() {
  const fake = fakeHubConnection()
  const states: LiveConnectionState[] = []
  const onConnected = vi.fn()
  const connection = createLiveConnection({
    url: '/hubs/test',
    accessTokenFactory: async () => 'token',
    onStateChange: (state) => states.push(state),
    onConnected,
    buildConnection: () => fake.hub,
  })
  return { fake, states, onConnected, connection }
}

describe('createLiveConnection', () => {
  it('connects and reports the first connection', async () => {
    const { states, onConnected, connection } = setup()

    await connection.start()

    expect(states).toEqual(['connecting', 'connected'])
    expect(onConnected).toHaveBeenCalledWith('initial')
  })

  it('fails when the first connection cannot be made', async () => {
    const { fake, states, onConnected, connection } = setup()
    fake.hub.start.mockRejectedValueOnce(new Error('offline'))

    await connection.start()

    expect(states).toEqual(['connecting', 'failed'])
    expect(onConnected).not.toHaveBeenCalled()
  })

  it('reports reconnecting while the connection is lost and reconnected when it returns', async () => {
    const { fake, states, onConnected, connection } = setup()
    await connection.start()

    fake.loseConnection()
    fake.restoreConnection()

    expect(states).toEqual(['connecting', 'connected', 'reconnecting', 'connected'])
    expect(onConnected).toHaveBeenLastCalledWith('reconnected')
  })

  it('fails once every automatic reconnect attempt has failed', async () => {
    const { fake, states, connection } = setup()
    await connection.start()

    fake.loseConnection()
    fake.close(new Error('gave up'))

    expect(states.at(-1)).toBe('failed')
    expect(fake.hub.start).toHaveBeenCalledTimes(1)
  })

  it('reconnects with a fresh token when the server closes a live connection, such as for an expired token', async () => {
    const { fake, states, onConnected, connection } = setup()
    await connection.start()

    fake.close(new Error('token expired'))
    await vi.waitFor(() => expect(onConnected).toHaveBeenLastCalledWith('reconnected'))

    expect(states).toEqual(['connecting', 'connected', 'reconnecting', 'connected'])
    expect(fake.hub.start).toHaveBeenCalledTimes(2)
  })

  it('fails when reconnecting after a server close does not succeed', async () => {
    const { fake, states, connection } = setup()
    await connection.start()
    fake.hub.start.mockRejectedValueOnce(new Error('offline'))

    fake.close(new Error('token expired'))

    await vi.waitFor(() => expect(states.at(-1)).toBe('failed'))
  })

  it('starts a new attempt when trying again after failing', async () => {
    const { fake, states, onConnected, connection } = setup()
    fake.hub.start.mockRejectedValueOnce(new Error('offline'))
    await connection.start()

    await connection.retry()

    expect(states).toEqual(['connecting', 'failed', 'reconnecting', 'connected'])
    expect(onConnected).toHaveBeenCalledWith('reconnected')
  })

  it('stops without reconnecting when the user leaves', async () => {
    const { fake, states, connection } = setup()
    await connection.start()

    await connection.stop()

    expect(states.at(-1)).toBe('stopped')
    expect(fake.hub.start).toHaveBeenCalledTimes(1)
  })

  it('passes server messages to handlers and calls server methods', async () => {
    const { fake, connection } = setup()
    const handler = vi.fn()

    connection.on('Something', handler)
    const result = await connection.invoke('DoSomething', 'c1')

    expect(fake.hub.on).toHaveBeenCalledWith('Something', handler)
    expect(fake.hub.invoke).toHaveBeenCalledWith('DoSomething', 'c1')
    expect(result).toBe('result')
  })
})
