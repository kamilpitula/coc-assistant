import type { RichTextDocument } from '@/shared/types/RichText'

// The autosave state machine behind the Keeper notes section (specs/scenario-preparation/ux.md section 73.2 and 73.3,
// design record PBI-SPL-009, D3): one small transition table per status, driven by the autosave hook. Timers, the
// network, and Done live in the hook; this table only maps state and event to state.

export type KeeperNotesSaveState =
  | { status: 'idle'; baseVersion: number }
  | { status: 'pending'; baseVersion: number; content: RichTextDocument | null }
  | { status: 'saving'; baseVersion: number; content: RichTextDocument | null; attempt: number; resave: boolean }
  | { status: 'saved'; baseVersion: number }
  | { status: 'retrying'; baseVersion: number; content: RichTextDocument | null; attempts: number }
  | { status: 'failed'; baseVersion: number; content: RichTextDocument | null }
  | { status: 'offline'; baseVersion: number; content: RichTextDocument | null }
  | {
      status: 'conflict'
      baseVersion: number
      content: RichTextDocument | null
      serverNotes: RichTextDocument | null
      serverVersion: number
    }
  | { status: 'refused'; baseVersion: number; content: RichTextDocument | null }
  | { status: 'gone' }

export type KeeperNotesSaveEvent =
  | { type: 'edited'; content: RichTextDocument | null }
  | { type: 'saveRequested' }
  | { type: 'saveSucceeded'; notesVersion: number }
  | { type: 'saveFailed'; offline: boolean }
  | { type: 'saveConflict'; keeperNotes: RichTextDocument | null; notesVersion: number }
  | { type: 'saveRefused' }
  | { type: 'sceneGone' }
  | { type: 'wentOffline' }
  | { type: 'cameOnline' }
  | { type: 'reloadServer' }
  | { type: 'keepMine' }

/** The editor opened with the given version and nothing unsaved. */
export function initialKeeperNotesSave(baseVersion: number): KeeperNotesSaveState {
  return { status: 'idle', baseVersion }
}

type Status = KeeperNotesSaveState['status']
type StateFor<S extends Status> = Extract<KeeperNotesSaveState, { status: S }>
type Transition = (state: KeeperNotesSaveState, event: KeeperNotesSaveEvent) => KeeperNotesSaveState

function on<S extends Status>(
  handle: (state: StateFor<S>, event: KeeperNotesSaveEvent) => KeeperNotesSaveState,
): Transition {
  return handle as Transition
}

function toOffline(baseVersion: number, content: RichTextDocument | null): KeeperNotesSaveState {
  return { status: 'offline', baseVersion, content }
}

function toSaving(baseVersion: number, content: RichTextDocument | null, attempt: number): KeeperNotesSaveState {
  return { status: 'saving', baseVersion, content, attempt, resave: false }
}

function afterSuccessfulSave(saving: StateFor<'saving'>, notesVersion: number): KeeperNotesSaveState {
  return saving.resave
    ? { status: 'pending', baseVersion: notesVersion, content: saving.content }
    : { status: 'saved', baseVersion: notesVersion }
}

function afterFailedSave(saving: StateFor<'saving'>, offline: boolean): KeeperNotesSaveState {
  if (offline) {
    return toOffline(saving.baseVersion, saving.content)
  }
  return saving.attempt >= 3
    ? { status: 'failed', baseVersion: saving.baseVersion, content: saving.content }
    : { status: 'retrying', baseVersion: saving.baseVersion, content: saving.content, attempts: saving.attempt }
}

const transitions: Record<Status, Transition> = {
  idle: on<'idle'>((state, event) =>
    event.type === 'edited' ? { status: 'pending', baseVersion: state.baseVersion, content: event.content } : state,
  ),

  pending: on<'pending'>((state, event) => {
    switch (event.type) {
      case 'edited':
        return { ...state, content: event.content }
      case 'saveRequested':
        return toSaving(state.baseVersion, state.content, 1)
      case 'wentOffline':
        return toOffline(state.baseVersion, state.content)
      default:
        return state
    }
  }),

  saving: on<'saving'>((state, event) => {
    switch (event.type) {
      case 'edited':
        return { ...state, content: event.content, resave: true }
      case 'saveSucceeded':
        return afterSuccessfulSave(state, event.notesVersion)
      case 'saveFailed':
        return afterFailedSave(state, event.offline)
      case 'saveConflict':
        return {
          status: 'conflict',
          baseVersion: state.baseVersion,
          content: state.content,
          serverNotes: event.keeperNotes,
          serverVersion: event.notesVersion,
        }
      case 'saveRefused':
        return { status: 'refused', baseVersion: state.baseVersion, content: state.content }
      case 'sceneGone':
        return { status: 'gone' }
      case 'wentOffline':
        return toOffline(state.baseVersion, state.content)
      default:
        return state
    }
  }),

  saved: on<'saved'>((state, event) =>
    event.type === 'edited' ? { status: 'pending', baseVersion: state.baseVersion, content: event.content } : state,
  ),

  retrying: on<'retrying'>((state, event) => {
    switch (event.type) {
      case 'edited':
        return { status: 'pending', baseVersion: state.baseVersion, content: event.content }
      case 'saveRequested':
        return toSaving(state.baseVersion, state.content, state.attempts + 1)
      case 'wentOffline':
        return toOffline(state.baseVersion, state.content)
      default:
        return state
    }
  }),

  failed: on<'failed'>((state, event) => {
    switch (event.type) {
      case 'edited':
        return { status: 'pending', baseVersion: state.baseVersion, content: event.content }
      case 'saveRequested':
        return toSaving(state.baseVersion, state.content, 1)
      case 'wentOffline':
        return toOffline(state.baseVersion, state.content)
      default:
        return state
    }
  }),

  offline: on<'offline'>((state, event) => {
    switch (event.type) {
      case 'edited':
        return { ...state, content: event.content }
      case 'cameOnline':
        return { status: 'pending', baseVersion: state.baseVersion, content: state.content }
      default:
        return state
    }
  }),

  conflict: on<'conflict'>((state, event) => {
    switch (event.type) {
      case 'edited':
        return { ...state, content: event.content }
      case 'reloadServer':
        return { status: 'saved', baseVersion: state.serverVersion }
      case 'keepMine':
        return toSaving(state.serverVersion, state.content, 1)
      default:
        return state
    }
  }),

  refused: on<'refused'>((state, event) => {
    switch (event.type) {
      case 'edited':
        return { status: 'pending', baseVersion: state.baseVersion, content: event.content }
      case 'saveRequested':
        return toSaving(state.baseVersion, state.content, 1)
      default:
        return state
    }
  }),

  gone: on<'gone'>((state) => state),
}

/** Applies one autosave event; unknown combinations leave the state unchanged. */
export function applyKeeperNotesSaveEvent(state: KeeperNotesSaveState, event: KeeperNotesSaveEvent): KeeperNotesSaveState {
  return transitions[state.status](state, event)
}
