/** An Investigator present as the Keeper sees it; the name comes from the Character Sheet and may be missing. */
export interface InvestigatorPresent {
  id: string
  name: string | null
}

/** An Investigator present as a Player sees it: a name and whether it is theirs, never an id. */
export interface PlayerInvestigatorPresent {
  name: string | null
  isYours: boolean
}

/** The Keeper's Active Scene (specs/scene-play/spec.md, API Contracts). Reveals are always empty until PBI-SPL-002. */
export interface KeeperActiveScene {
  kind: 'keeper'
  sceneId: string
  scenarioId: string
  scenarioTitle: string
  title: string
  /** "" when the Scene has no location. */
  location: string
  startedAt: string | null
  investigatorsPresent: InvestigatorPresent[]
  reveals: unknown[]
}

/** What a Player whose Investigator is present sees. */
export interface PresentPlayerActiveScene {
  kind: 'present-player'
  title: string
  location: string
  investigatorsPresent: PlayerInvestigatorPresent[]
}

/** What any other Player sees: only that the Scene is in progress. */
export interface AbsentPlayerActiveScene {
  kind: 'absent-player'
  title: string
}

/** The Active Scene as the server projected it for the caller; null (not this type) when no Scene is Active. */
export type ActiveScene = KeeperActiveScene | PresentPlayerActiveScene | AbsentPlayerActiveScene

/** The choice the Keeper submits when starting a Scene. */
export interface StartSceneInput {
  presentInvestigatorIds: string[]
  finishActiveScene: boolean
}

/** An Approved Investigator the Keeper can choose, from the roster. */
export interface ApprovedInvestigator {
  id: string
  name: string | null
  playerName: string
}
