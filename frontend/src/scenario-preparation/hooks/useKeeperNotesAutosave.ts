import { onlineManager, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

import { useSaveKeeperNotes } from '@/scenario-preparation/hooks/useScenes'
import {
  applyKeeperNotesSaveEvent,
  initialKeeperNotesSave,
  type KeeperNotesSaveState,
} from '@/scenario-preparation/services/keeperNotesSave'
import {
  KeeperNotesConflictError,
  sceneQueryKeys,
  SceneNotFoundError,
  SceneValidationError,
  type SavedKeeperNotes,
} from '@/scenario-preparation/services/sceneApi'
import { useUnsavedChangesPrompt } from '@/shared/hooks/useUnsavedChangesPrompt'
import { RICH_TEXT_MAX_BYTES, richTextByteLength } from '@/shared/services/richText'
import type { Scene } from '@/scenario-preparation/types/Scene'
import type { RichTextDocument } from '@/shared/types/RichText'

/** A change counts once the editor reports a content change after it mounts, not by comparing JSON text. */
const DEBOUNCE_MS = 1000

/** A failed save retries after 2 seconds, then after 4 seconds: 3 attempts in all. */
const RETRY_DELAYS_MS = [2000, 4000]

interface UseKeeperNotesAutosaveArgs {
  campaignId: string
  scenarioId: string
  sceneId: string
  /** The notesVersion the editor opened with; confirmed saves advance it. */
  notesVersion: number
  /** Leaves the editing state once the notes are saved. */
  onDone: () => void
}

function hasUnsavedChanges(state: KeeperNotesSaveState): boolean {
  return (
    state.status === 'pending' ||
    state.status === 'saving' ||
    state.status === 'retrying' ||
    state.status === 'failed' ||
    state.status === 'offline' ||
    state.status === 'conflict' ||
    state.status === 'refused'
  )
}

function isSendable(state: KeeperNotesSaveState): state is SendableState {
  return state.status === 'pending' || state.status === 'retrying' || state.status === 'failed'
}

type SendableState = Extract<KeeperNotesSaveState, { status: 'pending' | 'retrying' | 'failed' }>

/**
 * Autosaves the Keeper notes: one debounced save per change, two timed retries, offline waiting, and the
 * reload-or-keep conflict choice (specs/scenario-preparation/ux.md section 73.2 and 73.3). 400, 404, and 409 answers
 * surface at once and are never retried; a save in flight is never doubled.
 */
export function useKeeperNotesAutosave({ campaignId, scenarioId, sceneId, notesVersion, onDone }: UseKeeperNotesAutosaveArgs) {
  const [state, dispatch] = useReducer(applyKeeperNotesSaveEvent, notesVersion, initialKeeperNotesSave)
  const save = useSaveKeeperNotes(campaignId, scenarioId, sceneId)
  const queryClient = useQueryClient()
  // The mutation result is a new object every render; callbacks and the unmount flush read it through a ref instead.
  const saveRef = useRef(save)
  const stateRef = useRef(state)
  const onDoneRef = useRef(onDone)
  const sendNowRef = useRef<(current: KeeperNotesSaveState) => boolean>(() => false)
  const mountedRef = useRef(true)
  const doneAfterSaveRef = useRef(false)
  const finishWaiterRef = useRef<{ promise: Promise<boolean>; resolve: (finished: boolean) => void } | null>(null)
  const [tooLong, setTooLong] = useState(false)
  const [showDoneOfflineHint, setShowDoneOfflineHint] = useState(false)
  useUnsavedChangesPrompt(hasUnsavedChanges(state))

  /** The promise the current finishEditing waits on; a second finish while one is pending joins the same wait. */
  const finishPromise = useCallback((): Promise<boolean> => {
    finishWaiterRef.current ??= ((): { promise: Promise<boolean>; resolve: (finished: boolean) => void } => {
      let resolve!: (finished: boolean) => void
      const promise = new Promise<boolean>((inner) => {
        resolve = inner
      })
      return { promise, resolve }
    })()
    return finishWaiterRef.current.promise
  }, [])

  const finishSave = useCallback((saved: SavedKeeperNotes) => {
    if (!mountedRef.current) {
      return
    }
    dispatch({ type: 'saveSucceeded', notesVersion: saved.notesVersion })
    if (doneAfterSaveRef.current) {
      doneAfterSaveRef.current = false
      onDoneRef.current()
      finishWaiterRef.current?.resolve(true)
      finishWaiterRef.current = null
    }
  }, [])

  const failSave = useCallback((error: unknown) => {
    if (!mountedRef.current) {
      return
    }
    doneAfterSaveRef.current = false
    finishWaiterRef.current?.resolve(false)
    finishWaiterRef.current = null
    if (error instanceof KeeperNotesConflictError) {
      dispatch({ type: 'saveConflict', keeperNotes: error.current.keeperNotes, notesVersion: error.current.notesVersion })
    } else if (error instanceof SceneValidationError) {
      dispatch({ type: 'saveRefused' })
    } else if (error instanceof SceneNotFoundError) {
      dispatch({ type: 'sceneGone' })
    } else {
      dispatch({ type: 'saveFailed', offline: !onlineManager.isOnline() })
    }
  }, [])

  const launch = useCallback(
    (content: RichTextDocument | null, version: number): boolean => {
      setTooLong(false)
      void save.mutateAsync({ keeperNotes: content, notesVersion: version }).then(finishSave, failSave)
      return true
    },
    [failSave, finishSave, save],
  )

  /** The editor's content fits the server's size limit; otherwise the over-limit flag goes up and nothing is sent. */
  const fitsLimit = useCallback((content: RichTextDocument | null): boolean => {
    if (content && richTextByteLength(content) > RICH_TEXT_MAX_BYTES) {
      setTooLong(true)
      return false
    }
    return true
  }, [])

  // Sends from a state with unsaved changes, without doubling a save in flight.
  const sendNow = useCallback(
    (current: KeeperNotesSaveState): boolean => {
      if (!isSendable(current) || !onlineManager.isOnline()) {
        if (!onlineManager.isOnline() && current.status !== 'offline') {
          dispatch({ type: 'wentOffline' })
        }
        return false
      }
      if (!fitsLimit(current.content)) {
        return false
      }
      dispatch({ type: 'saveRequested' })
      return launch(current.content, current.baseVersion)
    },
    [fitsLimit, launch],
  )

  // One debounced save per change.
  useEffect(() => {
    if (state.status !== 'pending') {
      return
    }
    const timer = setTimeout(() => void sendNowRef.current(state), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [state])

  // A failed save retries after 2 seconds, then after 4 seconds.
  useEffect(() => {
    if (state.status !== 'retrying') {
      return
    }
    const delay = state.attempts <= RETRY_DELAYS_MS.length ? RETRY_DELAYS_MS[state.attempts - 1] : RETRY_DELAYS_MS.at(-1)!
    const timer = setTimeout(() => void sendNowRef.current(state), delay)
    return () => clearTimeout(timer)
  }, [state])

  // The browser going offline pauses saving; coming back resumes it and clears the Done hint.
  useEffect(
    () =>
      onlineManager.subscribe(() => {
        if (onlineManager.isOnline()) {
          setShowDoneOfflineHint(false)
          dispatch({ type: 'cameOnline' })
        } else {
          dispatch({ type: 'wentOffline' })
        }
      }),
    [],
  )

  // Leaving with an unsaved change still tries to save it once; the cache merge keeps it.
  // A refused save is never sent: its content failed validation and stays for the Keeper to fix.
  useEffect(
    () => () => {
      mountedRef.current = false
      finishWaiterRef.current?.resolve(false)
      finishWaiterRef.current = null
      const current = stateRef.current
      const latest = saveRef.current
      if (isSendable(current) && onlineManager.isOnline()) {
        const content = current.content
        if (!content || richTextByteLength(content) <= RICH_TEXT_MAX_BYTES) {
          void latest
            .mutateAsync({ keeperNotes: content, notesVersion: current.baseVersion })
            .then(
              () => undefined,
              () => undefined,
            )
        }
      }
    },
    [],
  )

  /**
   * Finishes editing like Done: with nothing unsaved it returns true at once; with a waiting or in-flight save it
   * saves at once and resolves true once the save is confirmed. A failed, refused, conflicting, missing, or offline
   * save keeps the editor open and resolves false, so the caller leaves it alone.
   */
  const finishEditing = useCallback((): Promise<boolean> => {
    const current = stateRef.current
    if (current.status === 'idle' || current.status === 'saved') {
      onDoneRef.current()
      return Promise.resolve(true)
    }
    if (current.status === 'offline') {
      setShowDoneOfflineHint(true)
      return Promise.resolve(false)
    }
    if (current.status === 'conflict' || current.status === 'refused' || current.status === 'gone') {
      return Promise.resolve(false)
    }
    doneAfterSaveRef.current = true
    if (isSendable(current) && !sendNowRef.current(current)) {
      doneAfterSaveRef.current = false
      return Promise.resolve(false)
    }
    return finishPromise()
  }, [finishPromise])

  // Done with unsaved changes saves at once and leaves only once the save is confirmed.
  const requestDone = useCallback(() => {
    void finishEditing()
  }, [finishEditing])

  /** Saves again after a failed save. */
  const retryNow = useCallback(() => {
    void sendNowRef.current(stateRef.current)
  }, [])

  /** Takes the newer notes from a conflict; the editor remounts with them and the cache follows. */
  const reloadServer = useCallback(() => {
    const current = stateRef.current
    if (current.status !== 'conflict') {
      return
    }
    queryClient.setQueryData<Scene>(sceneQueryKeys.detail(campaignId, scenarioId, sceneId), (cached) =>
      cached === undefined ? cached : { ...cached, keeperNotes: current.serverNotes, notesVersion: current.serverVersion },
    )
    dispatch({ type: 'reloadServer' })
  }, [campaignId, queryClient, scenarioId, sceneId])

  /** Saves the editor's content over the newer notes. */
  const keepMine = useCallback(() => {
    const current = stateRef.current
    if (current.status !== 'conflict' || !fitsLimit(current.content)) {
      return
    }
    dispatch({ type: 'keepMine' })
    launch(current.content, current.serverVersion)
  }, [fitsLimit, launch])

  /** Reports a content change; clears an over-limit flag so a shorter text saves again. */
  const edited = useCallback((content: RichTextDocument | null) => {
    setTooLong(false)
    dispatch({ type: 'edited', content })
  }, [])

  // Callbacks and timers read the latest values through refs; refs change in an effect, never during render.
  useEffect(() => {
    saveRef.current = save
    stateRef.current = state
    onDoneRef.current = onDone
    sendNowRef.current = sendNow
  })

  return { state, edited, requestDone, finishEditing, retryNow, reloadServer, keepMine, tooLong, showDoneOfflineHint }
}
