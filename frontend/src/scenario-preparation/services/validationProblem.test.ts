import { describe, expect, it } from 'vitest'

import { readErrorKeys } from './validationProblem'

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 400 })

describe('readErrorKeys', () => {
  it('returns the error keys lower-cased, whatever the casing', async () => {
    const keys = await readErrorKeys(jsonResponse({ errors: { Title: ['x'], keeperNotes: ['y'] } }))

    expect(keys).toEqual(['title', 'keepernotes'])
  })

  it('returns nothing for a body without errors or one that is not JSON', async () => {
    expect(await readErrorKeys(jsonResponse({ title: 'Bad' }))).toEqual([])
    expect(await readErrorKeys(new Response('not json', { status: 400 }))).toEqual([])
  })
})
