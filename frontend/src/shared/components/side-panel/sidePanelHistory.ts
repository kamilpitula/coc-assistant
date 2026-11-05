import { sidePanelSearchSchema, toPanelSearch, type OpenPanel } from './sidePanelParams'

/** The search param keys a panel owns, derived from the schema so a panel key needs one edit; closing without the marker strips exactly these. */
const SIDE_PANEL_SEARCH_KEYS = Object.keys(sidePanelSearchSchema.shape) as (keyof typeof sidePanelSearchSchema.shape)[]

/**
 * The navigation state a panel open or close carries: the app's status message plus the marker that says this entry
 * opened its panel (PBI-NAV-002 design record D2). The marker is declared on `HistoryState` in
 * `campaign-play/types/navigationState.ts`. History state survives a reload, so a fresh tab replaces instead of going back.
 */
export interface SidePanelHistoryState {
  statusMessage?: string
  sidePanelOpenedHere?: boolean
}

export interface OpenPanelNavigation {
  search: Record<string, string>
  state: SidePanelHistoryState
  /** True when a panel is already open: the new panel replaces that entry instead of pushing. */
  replace: boolean
}

/** Opening a panel pushes an entry with the marker (or replaces the open panel's entry) and keeps the current state. */
export function openPanelNavigation(panel: OpenPanel, currentState: SidePanelHistoryState | undefined, isPanelOpen: boolean): OpenPanelNavigation {
  return {
    search: toPanelSearch(panel),
    state: { ...currentState, sidePanelOpenedHere: true },
    replace: isPanelOpen,
  }
}

export type ClosePanelNavigation = { back: true } | { back: false; search: Record<string, unknown>; state: SidePanelHistoryState; replace: true }

/**
 * Closing the panel goes back when the marker is present (browser back then closes it too); otherwise it replaces the
 * entry without the panel params. Either way the page under the panel is not remounted.
 */
export function closePanelNavigation(
  currentSearch: Record<string, unknown>,
  currentState: SidePanelHistoryState | undefined,
): ClosePanelNavigation {
  if (currentState?.sidePanelOpenedHere === true) {
    return { back: true }
  }
  const search = { ...currentSearch }
  for (const key of SIDE_PANEL_SEARCH_KEYS) {
    delete search[key]
  }
  return { back: false, search, state: { ...currentState, sidePanelOpenedHere: undefined }, replace: true }
}
