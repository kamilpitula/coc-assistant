import { describe, expect, it } from 'vitest'

import { ORIGINS, originSearchSchema, resolveBackLink, type BackLinkTarget } from './backLinkOrigin'

// specs/navigation/ux.md section 4 and PBI-NAV-002 design record D6: `from` is an allow-list, never a URL,
// and anything outside it falls back to the page's structural back link, silently.
describe('originSearchSchema', () => {
  it('accepts a missing from and the allow-listed origin', () => {
    expect(originSearchSchema.parse({})).toEqual({})
    expect(originSearchSchema.parse({ from: 'active-scene' })).toEqual({ from: 'active-scene' })
  })

  it('never throws, degrading garbage to an absent from', () => {
    expect(originSearchSchema.parse({ from: 'wall' })).toEqual({ from: undefined })
    expect(originSearchSchema.parse({ from: 'https://example.com' })).toEqual({ from: undefined })
    expect(originSearchSchema.parse({ from: 42 })).toEqual({ from: undefined })
  })

  it('lists the single allowed origin', () => {
    expect([...ORIGINS]).toEqual(['active-scene'])
  })
})

describe('resolveBackLink', () => {
  const fallback: BackLinkTarget = { label: 'Lucy Ward', to: '/campaigns/$campaignId/investigators/$investigatorId' }
  const originTargets = { 'active-scene': { label: 'The Corbitt House', to: '/campaigns/$campaignId/active-scene' } }

  it('returns the origin target for an allow-listed from', () => {
    expect(resolveBackLink('active-scene', fallback, originTargets)).toEqual(originTargets['active-scene'])
  })

  it('falls back for a missing, unknown, non-string, or URL-string from', () => {
    expect(resolveBackLink(undefined, fallback, originTargets)).toEqual(fallback)
    expect(resolveBackLink('wall', fallback, originTargets)).toEqual(fallback)
    expect(resolveBackLink(42, fallback, originTargets)).toEqual(fallback)
    expect(resolveBackLink('https://example.com', fallback, originTargets)).toEqual(fallback)
  })
})
