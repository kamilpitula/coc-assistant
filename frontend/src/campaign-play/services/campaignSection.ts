/** The Campaign navigation entry a page belongs to; sheet, wizard, and review pages belong to the overview. */
export type CampaignSection = 'overview' | 'active-scene' | 'wall' | 'settings'

function isTabOrSubRoute(routeId: string, tabRouteId: string): boolean {
  return routeId === tabRouteId || routeId.startsWith(`${tabRouteId}/`)
}

/** The tab for a Campaign leaf route id; Active Scene stays current on every sub-route under it (specs/navigation/ux.md section 2). */
export function campaignSectionOf(routeId: string): CampaignSection {
  if (isTabOrSubRoute(routeId, '/campaigns/$campaignId/active-scene')) {
    return 'active-scene'
  }

  if (isTabOrSubRoute(routeId, '/campaigns/$campaignId/wall')) {
    return 'wall'
  }

  if (isTabOrSubRoute(routeId, '/campaigns/$campaignId/settings')) {
    return 'settings'
  }

  return 'overview'
}

/** Whether the route id is the Campaign overview; every other Campaign page belongs to a section instead. */
export function isOverviewRoute(routeId: string): boolean {
  return routeId === '/campaigns/$campaignId/'
}
