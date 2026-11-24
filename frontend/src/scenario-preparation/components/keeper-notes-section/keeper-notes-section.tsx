import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'

import { useKeeperNotesAutosave } from '@/scenario-preparation/hooks/useKeeperNotesAutosave'
import type { KeeperNotesSaveState } from '@/scenario-preparation/services/keeperNotesSave'
import { isEmptyRichText } from '@/shared/services/richText'
import type { RichTextDocument } from '@/shared/types/RichText'
import { RichTextEditor } from '@/shared/components/rich-text-editor/rich-text-editor'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'

/** The visible save status for each autosave state (specs/scenario-preparation/ux.md section 73.2). */
function statusText(state: KeeperNotesSaveState): string {
  switch (state.status) {
    case 'pending':
    case 'saving':
      return 'Saving...'
    case 'saved':
      return 'All changes saved'
    case 'retrying':
      return "Couldn't save. Retrying..."
    case 'offline':
      return "You're offline. Your changes will save when you're back online."
    case 'conflict':
      return 'Not saved yet.'
    default:
      return ''
  }
}

/**
 * What the visually hidden live region announces (SP-A11Y-63): only the retrying and offline states, and
 * "All changes saved" when it follows one of those or a conflict. The routine "Saving..." stays silent.
 */
function announcementFor(previous: KeeperNotesSaveState['status'] | null, state: KeeperNotesSaveState): string | null {
  if (state.status === 'retrying') {
    return "Couldn't save. Retrying..."
  }
  if (state.status === 'offline') {
    return "You're offline. Your changes will save when you're back online."
  }
  if (state.status === 'saved' && (previous === 'retrying' || previous === 'offline' || previous === 'conflict')) {
    return 'All changes saved'
  }
  return null
}

interface KeeperNotesSectionProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  keeperNotes: RichTextDocument | null
  notesVersion: number
  /** Hides the reading state's Edit while the Scene page edits the title and location (ux.md section 14). */
  hideEdit?: boolean
  /** Lets the Scene page finish an in-progress notes edit before it opens the title form (ux.md section 14). */
  sectionRef?: Ref<KeeperNotesSectionHandle>
}

/** What the Scene page needs to finish the notes edit before it opens the title form. */
export interface KeeperNotesSectionHandle {
  /**
   * Returns the section to its reading state like Done, flushing a waiting save first. Resolves true once reading;
   * resolves false when the editor stays open (a failed, refused, conflicting, missing, or offline save).
   */
  finishEditing: () => Promise<boolean>
}

/** What the section needs to finish an in-progress edit from its handle. */
interface EditingKeeperNotesHandle {
  finishEditing: () => Promise<boolean>
}

/**
 * A Scene's Keeper notes with "Edit", autosave, and "Done", in every Scene status (specs/scenario-preparation/ux.md
 * section 73). A live update refreshes the reading state but never replaces text being edited; saving names the
 * version the editor opened with, and a stale save offers the newer notes or keeps mine.
 */
export function KeeperNotesSection({ campaignId, scenarioId, sceneId, keeperNotes, notesVersion, hideEdit = false, sectionRef }: KeeperNotesSectionProps) {
  const [editing, setEditing] = useState(false)
  const [returnedFromEdit, setReturnedFromEdit] = useState(false)
  const editingRef = useRef<EditingKeeperNotesHandle | null>(null)

  // Reading has nothing to finish; an in-progress edit finishes through the editor below.
  useImperativeHandle(
    sectionRef,
    () => ({
      finishEditing: () => editingRef.current?.finishEditing() ?? Promise.resolve(true),
    }),
    [],
  )

  if (!editing) {
    return (
      <ReadingKeeperNotes
        keeperNotes={keeperNotes}
        hideEdit={hideEdit}
        autoFocusEdit={returnedFromEdit}
        onEdit={() => {
          setReturnedFromEdit(false)
          setEditing(true)
        }}
      />
    )
  }

  return (
    <EditingKeeperNotes
      campaignId={campaignId}
      scenarioId={scenarioId}
      sceneId={sceneId}
      keeperNotes={keeperNotes}
      notesVersion={notesVersion}
      editorRef={editingRef}
      onDone={() => {
        setReturnedFromEdit(true)
        setEditing(false)
      }}
    />
  )
}

function ReadingKeeperNotes({
  keeperNotes,
  hideEdit,
  autoFocusEdit,
  onEdit,
}: {
  keeperNotes: RichTextDocument | null
  hideEdit: boolean
  autoFocusEdit: boolean
  onEdit: () => void
}) {
  const headingId = useId()
  const editButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (autoFocusEdit && !hideEdit) {
      editButtonRef.current?.focus()
    }
  }, [autoFocusEdit, hideEdit])

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          Keeper notes
        </h2>
        {!hideEdit && (
          <Button ref={editButtonRef} type="button" variant="outline" size="sm" aria-label="Edit Keeper notes" onClick={onEdit}>
            Edit
          </Button>
        )}
      </div>
      {keeperNotes && !isEmptyRichText(keeperNotes) ? (
        <RichTextView document={keeperNotes} />
      ) : (
        <p className="text-sm text-muted-foreground">No Keeper notes yet.</p>
      )}
    </section>
  )
}

function EditingKeeperNotes({
  campaignId,
  scenarioId,
  sceneId,
  keeperNotes,
  notesVersion,
  editorRef,
  onDone,
}: KeeperNotesSectionProps & { editorRef: Ref<EditingKeeperNotesHandle>; onDone: () => void }) {
  const headingId = useId()
  const hintId = useId()
  const errorId = useId()
  const editorId = useId()
  const autosave = useKeeperNotesAutosave({ campaignId, scenarioId, sceneId, notesVersion, onDone })
  const { state } = autosave
  useImperativeHandle(
    editorRef,
    () => ({
      finishEditing: () => autosave.finishEditing(),
    }),
    [autosave],
  )
  // The editor starts from the notes at edit time and is remounted with the newer notes on reload.
  const [editorNotes, setEditorNotes] = useState(keeperNotes)
  const [editorKey, setEditorKey] = useState(0)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const previousStatusRef = useRef<KeeperNotesSaveState['status'] | null>(null)

  useEffect(() => {
    document.getElementById(editorId)?.focus()
    // Focus again when the editor remounts with reloaded notes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey])

  useEffect(() => {
    const announced = announcementFor(previousStatusRef.current, state)
    previousStatusRef.current = state.status
    if (announced) {
      setAnnouncement(announced)
    }
  }, [state])

  const reloadNewer = () => {
    if (state.status !== 'conflict') {
      return
    }
    setEditorNotes(state.serverNotes)
    setEditorKey((key) => key + 1)
    autosave.reloadServer()
  }

  const keepMine = () => {
    autosave.keepMine()
    document.getElementById(editorId)?.focus()
  }

  const describedBy = [hintId, autosave.tooLong ? errorId : undefined].filter(Boolean).join(' ') || undefined
  const conflict = state.status === 'conflict' ? state : null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-lg font-semibold">
        Keeper notes
      </h2>
      <p id={hintId} className="text-sm text-muted-foreground">
        Only you can read these. Changes save as you type.
      </p>
      <RichTextEditor
        key={editorKey}
        id={editorId}
        labelledBy={headingId}
        describedBy={describedBy}
        invalid={autosave.tooLong}
        initialValue={editorNotes}
        onChange={autosave.edited}
      />
      {autosave.tooLong && (
        <p id={errorId} className="text-sm text-destructive">
          Keeper notes are too long. Shorten them and try again.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground empty:hidden">{autosave.tooLong ? '' : statusText(state)}</p>
        <Button type="button" size="sm" aria-disabled={state.status === 'saving'} onClick={autosave.requestDone}>
          Done
        </Button>
      </div>
      <p role="status" className="sr-only">
        {announcement ?? ''}
      </p>
      <SaveAlerts
        state={state}
        showDoneOfflineHint={autosave.showDoneOfflineHint}
        onRetry={autosave.retryNow}
        onReload={reloadNewer}
        onKeepMine={keepMine}
        conflict={conflict}
      />
    </section>
  )
}

function SaveAlerts({
  state,
  showDoneOfflineHint,
  onRetry,
  onReload,
  onKeepMine,
  conflict,
}: {
  state: KeeperNotesSaveState
  showDoneOfflineHint: boolean
  onRetry: () => void
  onReload: () => void
  onKeepMine: () => void
  conflict: Extract<KeeperNotesSaveState, { status: 'conflict' }> | null
}) {
  return (
    <>
      {state.status === 'failed' && (
        <Alert variant="destructive" role="alert">
          <p>Couldn&apos;t save your changes.</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        </Alert>
      )}
      {state.status === 'refused' && (
        <Alert variant="destructive" role="alert">
          These Keeper notes can&apos;t be saved. Shorten them or remove unsupported content.
        </Alert>
      )}
      {state.status === 'gone' && (
        <Alert variant="destructive" role="alert">
          We couldn&apos;t find this Scene any more. Copy anything you need.
        </Alert>
      )}
      {showDoneOfflineHint && (
        <Alert variant="warning" role="alert">
          Your changes aren&apos;t saved yet. Keep this page open until you&apos;re back online, then select Done.
        </Alert>
      )}
      {conflict && (
        <Alert variant="destructive" role="alert">
          <p className="font-medium">These Keeper notes were changed in another window.</p>
          <p className="mt-1">
            &quot;Reload newer notes&quot; replaces your unsaved changes. &quot;Keep mine&quot; saves your version over the newer one.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onReload}>
              Reload newer notes
            </Button>
            <Button type="button" size="sm" onClick={onKeepMine}>
              Keep mine
            </Button>
          </div>
        </Alert>
      )}
    </>
  )
}
