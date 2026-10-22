import { describe, expect, it } from 'vitest'

import { authHeaders, bearerHeaders } from './authHeaders'

describe('authHeaders', () => {
  it('sets the bearer token and a JSON content type', () => {
    expect(authHeaders('token')).toEqual({ Authorization: 'Bearer token', 'Content-Type': 'application/json' })
  })

  it('bearerHeaders sets the bearer token only, so a multipart request keeps its browser-set boundary', () => {
    expect(bearerHeaders('token')).toEqual({ Authorization: 'Bearer token' })
  })
})
