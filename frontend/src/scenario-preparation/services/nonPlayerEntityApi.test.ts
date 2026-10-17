import { afterEach, describe, expect, it, vi } from 'vitest'

import { getNonPlayerEntities, NonPlayerEntityNotFoundError, nonPlayerEntityQueryKeys } from './nonPlayerEntityApi'

const respond = (status: number, body?: unknown) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body ?? {}), { status }))

describe('getNonPlayerEntities', () => {
  afterEach(() => vi.restoreAllMocks())

  it('parses a list holding both types', async () => {
    const fetchSpy = respond(200, {
      items: [
        { id: 'a', type: 'HumanNpc', name: 'Mr. Knott' },
        { id: 'b', type: 'MythosCreature', name: 'Ghoul' },
      ],
    })

    const items = await getNonPlayerEntities('token', 'c1')

    expect(items.map((item) => item.type)).toEqual(['HumanNpc', 'MythosCreature'])
    expect(fetchSpy).toHaveBeenCalledWith('/api/campaigns/c1/non-player-entities', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }))
  })

  it('rejects an unknown type and an extra field', async () => {
    respond(200, { items: [{ id: 'a', type: 'Item', name: 'x' }] })
    await expect(getNonPlayerEntities('t', 'c1')).rejects.toThrow()

    respond(200, { items: [{ id: 'a', type: 'HumanNpc', name: 'x', profession: 'y' }] })
    await expect(getNonPlayerEntities('t', 'c1')).rejects.toThrow()
  })

  it('throws a not-found error on 404 and a plain error on other failures', async () => {
    respond(404)
    await expect(getNonPlayerEntities('t', 'c1')).rejects.toBeInstanceOf(NonPlayerEntityNotFoundError)

    respond(500)
    await expect(getNonPlayerEntities('t', 'c1')).rejects.toThrow('500')
  })

  it('builds query keys that share a prefix so one invalidation reaches the list', () => {
    expect(nonPlayerEntityQueryKeys.list('c1').slice(0, 3)).toEqual(nonPlayerEntityQueryKeys.all('c1'))
  })
})
