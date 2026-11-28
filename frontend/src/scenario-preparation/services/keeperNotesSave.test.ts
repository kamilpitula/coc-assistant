import { describe, expect, it } from 'vitest'

import type { RichTextDocument } from '@/shared/types/RichText'

import { applyKeeperNotesSaveEvent, initialKeeperNotesSave, type KeeperNotesSaveState } from './keeperNotesSave'

// specs/scenario-preparation/ux.md section 73.2 and 73.3: the autosave state machine (design record PBI-SPL-009, D3).

const notes = (text: string): RichTextDocument => ({
  root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] },
})

const edited = (state: KeeperNotesSaveState, content = notes('Cellar')) =>
  applyKeeperNotesSaveEvent(state, { type: 'edited', content })

describe('keeper notes save', () => {
  it('starts idle with the version the editor opened with', () => {
    expect(initialKeeperNotesSave(4)).toEqual({ status: 'idle', baseVersion: 4 })
  })

  it('sends a change, then records the confirmed version', () => {
    const pending = edited(initialKeeperNotesSave(0))
    const saving = applyKeeperNotesSaveEvent(pending, { type: 'saveRequested' })

    expect(saving).toEqual({ status: 'saving', baseVersion: 0, content: notes('Cellar'), attempt: 1, resave: false })
    expect(applyKeeperNotesSaveEvent(saving, { type: 'saveSucceeded', notesVersion: 1 })).toEqual({ status: 'saved', baseVersion: 1 })
  })

  it('saves again when the Keeper types during a save', () => {
    const saving = applyKeeperNotesSaveEvent(edited(initialKeeperNotesSave(0)), { type: 'saveRequested' })
    const changed = edited(saving, notes('Attic'))

    expect(changed).toEqual({ status: 'saving', baseVersion: 0, content: notes('Attic'), attempt: 1, resave: true })
    expect(applyKeeperNotesSaveEvent(changed, { type: 'saveSucceeded', notesVersion: 1 })).toEqual({
      status: 'pending',
      baseVersion: 1,
      content: notes('Attic'),
    })
  })

  it('retries twice after a network failure, then fails', () => {
    const saving = applyKeeperNotesSaveEvent(edited(initialKeeperNotesSave(0)), { type: 'saveRequested' })
    const retrying = applyKeeperNotesSaveEvent(saving, { type: 'saveFailed', offline: false })

    expect(retrying).toEqual({ status: 'retrying', baseVersion: 0, content: notes('Cellar'), attempts: 1 })
    const second = applyKeeperNotesSaveEvent(retrying, { type: 'saveRequested' })
    expect(second).toEqual({ status: 'saving', baseVersion: 0, content: notes('Cellar'), attempt: 2, resave: false })

    const retryingAgain = applyKeeperNotesSaveEvent(second, { type: 'saveFailed', offline: false })
    expect(retryingAgain).toEqual({ status: 'retrying', baseVersion: 0, content: notes('Cellar'), attempts: 2 })
    const third = applyKeeperNotesSaveEvent(retryingAgain, { type: 'saveRequested' })
    expect(applyKeeperNotesSaveEvent(third, { type: 'saveFailed', offline: false })).toEqual({
      status: 'failed',
      baseVersion: 0,
      content: notes('Cellar'),
    })
  })

  it('restarts the attempt count when the Keeper types while retrying', () => {
    const saving = applyKeeperNotesSaveEvent(edited(initialKeeperNotesSave(0)), { type: 'saveRequested' })
    const retrying = applyKeeperNotesSaveEvent(saving, { type: 'saveFailed', offline: false })

    expect(edited(retrying, notes('Attic'))).toEqual({ status: 'pending', baseVersion: 0, content: notes('Attic') })
  })

  it('retries from a failed save when asked', () => {
    const failed: KeeperNotesSaveState = { status: 'failed', baseVersion: 0, content: notes('Cellar') }

    expect(applyKeeperNotesSaveEvent(failed, { type: 'saveRequested' })).toEqual({
      status: 'saving',
      baseVersion: 0,
      content: notes('Cellar'),
      attempt: 1,
      resave: false,
    })
  })

  it('enters offline when the browser reports it and resumes with the unsaved content', () => {
    const pending = edited(initialKeeperNotesSave(0))
    const offline = applyKeeperNotesSaveEvent(pending, { type: 'wentOffline' })

    expect(offline).toEqual({ status: 'offline', baseVersion: 0, content: notes('Cellar') })
    expect(applyKeeperNotesSaveEvent(offline, { type: 'cameOnline' })).toEqual({
      status: 'pending',
      baseVersion: 0,
      content: notes('Cellar'),
    })
  })

  it('moves a failed in-flight save offline when the failure says so', () => {
    const saving = applyKeeperNotesSaveEvent(edited(initialKeeperNotesSave(0)), { type: 'saveRequested' })

    expect(applyKeeperNotesSaveEvent(saving, { type: 'saveFailed', offline: true })).toEqual({
      status: 'offline',
      baseVersion: 0,
      content: notes('Cellar'),
    })
  })

  it('keeps typed text offline and ignores sends until back online', () => {
    const offline: KeeperNotesSaveState = { status: 'offline', baseVersion: 0, content: notes('Cellar') }
    const updated = edited(offline, notes('Attic'))

    expect(updated).toEqual({ status: 'offline', baseVersion: 0, content: notes('Attic') })
    expect(applyKeeperNotesSaveEvent(updated, { type: 'saveRequested' })).toEqual(updated)
  })

  it('pauses on a conflict and keeps the typed text', () => {
    const saving = applyKeeperNotesSaveEvent(edited(initialKeeperNotesSave(4)), { type: 'saveRequested' })
    const conflict = applyKeeperNotesSaveEvent(saving, { type: 'saveConflict', keeperNotes: notes('Newer'), notesVersion: 5 })

    expect(conflict).toEqual({
      status: 'conflict',
      baseVersion: 4,
      content: notes('Cellar'),
      serverNotes: notes('Newer'),
      serverVersion: 5,
    })
    expect(edited(conflict, notes('Mine'))).toEqual({
      status: 'conflict',
      baseVersion: 4,
      content: notes('Mine'),
      serverNotes: notes('Newer'),
      serverVersion: 5,
    })
  })

  it('reloads the newer notes as saved and keeps mine as a save at the newer version', () => {
    const conflict: KeeperNotesSaveState = {
      status: 'conflict',
      baseVersion: 4,
      content: notes('Mine'),
      serverNotes: notes('Newer'),
      serverVersion: 5,
    }

    expect(applyKeeperNotesSaveEvent(conflict, { type: 'reloadServer' })).toEqual({ status: 'saved', baseVersion: 5 })
    expect(applyKeeperNotesSaveEvent(conflict, { type: 'keepMine' })).toEqual({
      status: 'saving',
      baseVersion: 5,
      content: notes('Mine'),
      attempt: 1,
      resave: false,
    })
  })

  it('refuses invalid notes without retrying and saves again on the next change or on Done', () => {
    const saving = applyKeeperNotesSaveEvent(edited(initialKeeperNotesSave(0)), { type: 'saveRequested' })
    const refused = applyKeeperNotesSaveEvent(saving, { type: 'saveRefused' })

    expect(refused).toEqual({ status: 'refused', baseVersion: 0, content: notes('Cellar') })
    expect(applyKeeperNotesSaveEvent(refused, { type: 'saveRequested' })).toEqual({
      status: 'saving',
      baseVersion: 0,
      content: notes('Cellar'),
      attempt: 1,
      resave: false,
    })
    expect(edited(refused, notes('Shorter'))).toEqual({ status: 'pending', baseVersion: 0, content: notes('Shorter') })
  })

  it('stops on a missing Scene', () => {
    const saving = applyKeeperNotesSaveEvent(edited(initialKeeperNotesSave(0)), { type: 'saveRequested' })
    const gone = applyKeeperNotesSaveEvent(saving, { type: 'sceneGone' })

    expect(gone).toEqual({ status: 'gone' })
    expect(edited(gone)).toEqual(gone)
  })

  it('ignores sends with nothing unsaved', () => {
    expect(applyKeeperNotesSaveEvent(initialKeeperNotesSave(0), { type: 'saveRequested' })).toEqual(initialKeeperNotesSave(0))
    expect(applyKeeperNotesSaveEvent({ status: 'saved', baseVersion: 1 }, { type: 'saveRequested' })).toEqual({
      status: 'saved',
      baseVersion: 1,
    })
  })
})
