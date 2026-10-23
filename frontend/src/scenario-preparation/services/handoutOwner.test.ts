import { describe, expect, it } from 'vitest'

import { sceneOwner } from '@/scenario-preparation/test-support/handoutOwnerFixtures'

import { describeHandoutOwner } from './handoutOwner'

// Design record PBI-SP-008, D3: one description per owner type for URLs, query keys, and pages.
describe('describeHandoutOwner', () => {
  describe('a Scene', () => {
    const scene = describeHandoutOwner(sceneOwner)

    it('addresses the Handouts under the Scene in the API', () => {
      expect(scene.handoutsUrl).toBe('/api/campaigns/c1/scenarios/s1/scenes/a1/handouts')
    })

    it('keys the Handouts under the Scene, so reloading the Scene reaches them', () => {
      expect(scene.detailKey).toEqual(['campaigns', 'c1', 'scenarios', 's1', 'scenes', 'a1'])
      expect(scene.handoutsKey).toEqual([...scene.detailKey, 'handouts'])
    })

    it('points at the Scene page, the Add Handout page, and each Handout page', () => {
      expect(scene.ownerPage).toEqual({
        to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
        params: { campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' },
      })
      expect(scene.addHandoutPage).toEqual({
        to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/new',
        params: { campaignId: 'c1', scenarioId: 's1', sceneId: 'a1' },
      })
      expect(scene.handoutPage('h1')).toEqual({
        to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/$handoutId',
        params: { campaignId: 'c1', scenarioId: 's1', sceneId: 'a1', handoutId: 'h1' },
      })
    })
  })
})
