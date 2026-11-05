/** The Keeper's Active Scene sub-tabs: Run plus its own route each (specs/scene-play/ux.md section 21.1). */
export type ActiveSceneSubTab = 'run' | 'to-reveal' | 'reference' | 'revealed'

/**
 * The sub-tab a Campaign leaf route id belongs to: the Active Scene layout reads the leaf match and stays on Run for
 * anything it does not recognize (specs/scene-play/ux.md section 21.1). Null when the route is outside the sub-tabs.
 */
export function activeSceneSubTabOf(leafRouteId: string | undefined): ActiveSceneSubTab | null {
  switch (leafRouteId) {
    case '/campaigns/$campaignId/active-scene/':
      return 'run'
    case '/campaigns/$campaignId/active-scene/to-reveal':
      return 'to-reveal'
    case '/campaigns/$campaignId/active-scene/reference':
      return 'reference'
    case '/campaigns/$campaignId/active-scene/revealed':
      return 'revealed'
    default:
      return null
  }
}
