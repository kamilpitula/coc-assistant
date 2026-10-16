/** One of a Campaign's ordered Scenarios as its Keeper sees it. The server's position is never sent; list order is the order. */
export interface Scenario {
  id: string
  title: string
  keeperNotes: string
}

/** What the Keeper types for a Scenario (specs/scenario-preparation/ux.md section 4). */
export interface ScenarioInput {
  title: string
  keeperNotes: string
}

/** The longest Scenario title (specs/scenario-preparation/spec.md). */
export const SCENARIO_TITLE_MAX_LENGTH = 200

/** The longest Keeper notes text (specs/scenario-preparation/spec.md). */
export const SCENARIO_KEEPER_NOTES_MAX_LENGTH = 10_000

export type ScenarioField = 'title' | 'keeperNotes'
