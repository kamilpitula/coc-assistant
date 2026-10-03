import type {
  CharacterSheetRules,
  CharacterSheetView,
  ValidationError,
} from '@/campaign-play/types/CharacterSheet'

/** Investigator statuses (CONTEXT.md, Character Readiness), as named on the wire. */
export const INVESTIGATOR_STATUSES = ['Draft', 'Submitted', 'ChangesRequested', 'Approved'] as const

export type InvestigatorStatus = (typeof INVESTIGATOR_STATUSES)[number]

/** Investigator summary (specs/campaign-play/spec.md, Investigator API shapes). */
export interface InvestigatorSummary {
  id: string
  status: InvestigatorStatus
  name: string | null
  changeRequestComment: string | null
  updatedAt: string
}

/** The Keeper's review read of a non-Draft Investigator. */
export interface KeeperInvestigator {
  id: string
  status: InvestigatorStatus
  playerName: string | null
  changeRequestComment: string | null
  updatedAt: string
  characterSheet: CharacterSheetView
  warnings: ValidationError[]
}

/** The owning Player's Character Sheet read. */
export interface MyCharacterSheet {
  investigatorId: string
  status: InvestigatorStatus
  playerName: string | null
  changeRequestComment: string | null
  characterSheet: CharacterSheetView
  rules: CharacterSheetRules
  validationErrors: ValidationError[]
}

/** The result of submitting: submitted, or rejected with the remaining errors (422). */
export type SubmitResult =
  | { kind: 'submitted'; investigator: InvestigatorSummary }
  | { kind: 'invalid'; validationErrors: ValidationError[] }
