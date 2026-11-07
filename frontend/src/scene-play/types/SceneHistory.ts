import type { KeeperReveal, PlayerReveal } from './Reveal'

/** An Investigator who was present when a Scene finished, or is present now for the Active Scene. The name may be missing. */
export interface HistoryInvestigatorPresent {
  id: string
  name: string | null
}

/** A played Scene as the Keeper sees it: every Reveal with its recipients, and the Investigators present. */
export interface KeeperHistoryScene {
  sceneId: string
  scenarioId: string
  scenarioTitle: string
  title: string
  /** Always set for a listed Scene. */
  startedAt: string
  /** Null for the Active Scene. */
  finishedAt: string | null
  investigatorsPresent: HistoryInvestigatorPresent[]
  /** Newest first. */
  reveals: KeeperReveal[]
}

/** The Campaign's played Scenes as the Keeper sees them, newest started first. */
export interface KeeperSceneHistory {
  kind: 'keeper'
  scenes: KeeperHistoryScene[]
}

/** A played Scene as a Player sees it: the Scenario title with only the Reveals that reached their Investigator. */
export interface PlayerHistoryScene {
  sceneId: string
  scenarioTitle: string
  title: string
  /** Always set for a listed Scene. */
  startedAt: string
  /** Null for the Active Scene. */
  finishedAt: string | null
  /** Only the Reveals that reached the caller's Investigator, newest first. */
  reveals: PlayerReveal[]
}

/** The Campaign's played Scenes as a Player sees them, newest started first, with their Investigator's name. */
export interface PlayerSceneHistory {
  kind: 'player'
  investigatorName: string | null
  scenes: PlayerHistoryScene[]
}

/** The Scene History as the caller may see it, told apart by the Player shape always carrying an Investigator name. */
export type SceneHistory = KeeperSceneHistory | PlayerSceneHistory
