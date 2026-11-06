import { describe, expect, it } from 'vitest'

import { activeSceneSubTabOf } from './activeSceneSubTab'

// specs/scene-play/ux.md section 21.1: each sub-tab owns its route.
describe('activeSceneSubTabOf', () => {
  it.each([
    ['/campaigns/$campaignId/active-scene/', 'run'],
    ['/campaigns/$campaignId/active-scene/to-reveal', 'to-reveal'],
    ['/campaigns/$campaignId/active-scene/reference', 'reference'],
    ['/campaigns/$campaignId/active-scene/revealed', 'revealed'],
  ] as const)('maps the leaf route id %s to %s', (routeId, expected) => {
    expect(activeSceneSubTabOf(routeId)).toBe(expected)
  })

  it.each([undefined, '/campaigns/$campaignId/active-scene', '/campaigns/$campaignId/wall'])('maps %s to null', (routeId) => {
    expect(activeSceneSubTabOf(routeId)).toBeNull()
  })
})
