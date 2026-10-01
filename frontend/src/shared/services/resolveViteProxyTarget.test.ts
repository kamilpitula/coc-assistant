import { describe, expect, it } from 'vitest'

import { resolveViteProxyTarget } from './resolveViteProxyTarget'

describe('resolveViteProxyTarget', () => {
  it('defaults to the local dev API when the env var is missing', () => {
    expect(resolveViteProxyTarget({})).toBe('http://localhost:5058')
  })

  it('returns VITE_API_PROXY_TARGET when it is set', () => {
    expect(resolveViteProxyTarget({ VITE_API_PROXY_TARGET: 'https://localhost:5059' })).toBe(
      'https://localhost:5059',
    )
  })

  it('ignores an empty VITE_API_PROXY_TARGET and uses the default', () => {
    expect(resolveViteProxyTarget({ VITE_API_PROXY_TARGET: '' })).toBe('http://localhost:5058')
  })

  it('trims surrounding whitespace', () => {
    expect(resolveViteProxyTarget({ VITE_API_PROXY_TARGET: '  https://api.local  ' })).toBe(
      'https://api.local',
    )
  })
})
