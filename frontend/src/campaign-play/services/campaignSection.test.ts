import { describe, expect, it } from 'vitest'

import type { FileRoutesById } from '@/routeTree.gen'

import { campaignSectionOf, isOverviewRoute, type CampaignSection } from './campaignSection'

// specs/navigation/ux.md section 2; NAV-UX-2, CO-UX-11.

/** Every Campaign route maps to its tab; a new Campaign route fails tsc until it is mapped here. */
const sections: Record<
  Extract<keyof FileRoutesById, '/campaigns/$campaignId' | `/campaigns/$campaignId/${string}`>,
  CampaignSection
> = {
  '/campaigns/$campaignId': 'overview',
  '/campaigns/$campaignId/': 'overview',
  '/campaigns/$campaignId/active-scene': 'active-scene',
  '/campaigns/$campaignId/human-npcs/$humanNpcId': 'overview',
  '/campaigns/$campaignId/investigator/': 'overview',
  '/campaigns/$campaignId/investigator/$step': 'overview',
  '/campaigns/$campaignId/investigator/clues': 'overview',
  '/campaigns/$campaignId/investigators/$investigatorId': 'overview',
  '/campaigns/$campaignId/investigators/$investigatorId_/clues': 'overview',
  '/campaigns/$campaignId/items/': 'overview',
  '/campaigns/$campaignId/items/$itemId/': 'overview',
  '/campaigns/$campaignId/items/$itemId/handouts/$handoutId': 'overview',
  '/campaigns/$campaignId/items/$itemId/handouts/new': 'overview',
  '/campaigns/$campaignId/items/new': 'overview',
  '/campaigns/$campaignId/mythos-creatures/$mythosCreatureId': 'overview',
  '/campaigns/$campaignId/non-player-entities/': 'overview',
  '/campaigns/$campaignId/non-player-entities/new': 'overview',
  '/campaigns/$campaignId/scenarios/$scenarioId/': 'overview',
  '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/': 'overview',
  '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/$handoutId': 'overview',
  '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/new': 'overview',
  '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/item-links/new': 'overview',
  '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/non-player-entity-links/$linkId': 'overview',
  '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/non-player-entity-links/new': 'overview',
  '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/start': 'overview',
  '/campaigns/$campaignId/scenarios/$scenarioId/scenes/new': 'overview',
  '/campaigns/$campaignId/scenarios/new': 'overview',
  '/campaigns/$campaignId/settings': 'settings',
  '/campaigns/$campaignId/wall': 'wall',
}

describe('campaignSectionOf', () => {
  it.each(Object.entries(sections))('maps %s to %s', (routeId, section) => {
    expect(campaignSectionOf(routeId)).toBe(section)
  })

  it('stays on Active Scene for Active Scene sub-routes', () => {
    expect(campaignSectionOf('/campaigns/$campaignId/active-scene/to-reveal')).toBe('active-scene')
    expect(campaignSectionOf('/campaigns/$campaignId/active-scene/reference')).toBe('active-scene')
  })

  it('matches route segments, not string prefixes', () => {
    expect(campaignSectionOf('/campaigns/$campaignId/active-scene-x')).toBe('overview')
  })
})

describe('isOverviewRoute', () => {
  it('is true only for the Campaign index route', () => {
    expect(isOverviewRoute('/campaigns/$campaignId/')).toBe(true)
    for (const routeId of Object.keys(sections)) {
      if (routeId !== '/campaigns/$campaignId/') {
        expect(isOverviewRoute(routeId)).toBe(false)
      }
    }
  })
})
