import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'

import '@/campaign-play/types/navigationState'
import { DeleteHandoutDialog } from '@/scenario-preparation/components/delete-handout-dialog/delete-handout-dialog'
import { HandoutBadges } from '@/scenario-preparation/components/handout-badges/handout-badges'
import { HandoutContent } from '@/scenario-preparation/components/handout-content/handout-content'
import { HandoutForm } from '@/scenario-preparation/components/handout-form/handout-form'
import { HandoutNotFound } from '@/scenario-preparation/components/handout-not-found/handout-not-found'
import { useDeleteHandout, useEditHandout, useHandout } from '@/scenario-preparation/hooks/useHandouts'
import { HandoutNotDeletableError, HandoutNotFoundError, HandoutValidationError } from '@/scenario-preparation/services/handoutApi'
import { HANDOUT_SCENE_FINISHED_MEANWHILE } from '@/scenario-preparation/services/handoutForm'
import { describeHandoutOwner, type HandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { isFileHandout, type Handout } from '@/scenario-preparation/types/Handout'
import type { HandoutOwnerContext } from '@/scenario-preparation/types/HandoutOwnerContext'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface HandoutPageProps {
  /** The Scene or Item whose Handout this is; the caller has already checked that the viewer is the Keeper. */
  owner: HandoutOwner
  handoutId: string
  context: HandoutOwnerContext
}

/**
 * One Handout for its Keeper: a view with "Edit" and "Delete Handout" as far as the owner allows, and the sentence that says why
 * not otherwise (specs/scenario-preparation/ux.md sections 42 and 65). An unknown Handout, or a 404 on save, gets the Handout
 * not-found page.
 */
export function HandoutPage({ owner, handoutId, context }: HandoutPageProps) {
  const handout = useHandout(owner, handoutId, true)
  const edit = useEditHandout(owner, handoutId)

  if (handout.data === null || edit.error instanceof HandoutNotFoundError) {
    return <HandoutNotFound owner={owner} backLabel={context.backLabel} />
  }

  if (handout.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Handout.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            context.refetchOwner()
            void handout.refetch()
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  if (!handout.data) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return <HandoutDetail owner={owner} context={context} handout={handout.data} edit={edit} />
}

type FocusTarget = 'edit' | 'heading'

interface HandoutDetailProps {
  owner: HandoutOwner
  context: HandoutOwnerContext
  handout: Handout
  edit: ReturnType<typeof useEditHandout>
}

function HandoutDetail({ owner, context, handout, edit }: HandoutDetailProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [returnFocusTo, setReturnFocusTo] = useState<FocusTarget | null>(null)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // The Edit button is mounted again when the form closes, so focus goes back to it; it may be gone once a Finished Scene loads.
  useEffect(() => {
    if (!isEditing && returnFocusTo) {
      ;((returnFocusTo === 'edit' ? editButtonRef.current : null) ?? headingRef.current)?.focus()
    }
  }, [isEditing, returnFocusTo])

  const startEditing = () => {
    edit.reset()
    setJustSaved(false)
    setReturnFocusTo(null)
    setIsEditing(true)
  }

  const stopEditing = (saved: boolean) => {
    const refusedAsFinished = !saved && edit.error instanceof SceneFinishedError
    setJustSaved(saved)
    setReturnFocusTo(refusedAsFinished ? 'heading' : 'edit')
    setIsEditing(false)
    if (refusedAsFinished) {
      context.refetchOwner()
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link {...describeHandoutOwner(owner).ownerPage} className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}>
        <ArrowLeft aria-hidden="true" />
        {context.backLabel}
      </Link>
      <p role="status" className="text-sm empty:hidden">
        {justSaved ? 'Handout saved.' : null}
      </p>
      <div className="flex flex-col gap-2">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold break-words outline-none">
          {handout.title}
        </h1>
        <p className="text-sm break-words text-muted-foreground">
          {context.ownerLabel}: {context.ownerName}
        </p>
        <HandoutBadges kind={handout.kind} visibility={handout.visibility} />
      </div>
      {isEditing ? (
        <EditHandoutForm handout={handout} edit={edit} onDone={stopEditing} />
      ) : (
        <HandoutView
          owner={owner}
          context={context}
          handout={handout}
          editButtonRef={editButtonRef}
          headingRef={headingRef}
          onEdit={startEditing}
        />
      )}
    </div>
  )
}

interface EditHandoutFormProps {
  handout: Handout
  edit: ReturnType<typeof useEditHandout>
  onDone: (saved: boolean) => void
}

function failureMessageFor(error: unknown): string | null {
  if (!error || error instanceof HandoutValidationError) {
    return null
  }
  return error instanceof SceneFinishedError ? HANDOUT_SCENE_FINISHED_MEANWHILE : "We couldn't save the Handout. Try again."
}

function EditHandoutForm({ handout, edit, onDone }: EditHandoutFormProps) {
  const validationError = edit.error instanceof HandoutValidationError ? edit.error : null

  return (
    <HandoutForm
      initialValues={{
        title: handout.title,
        kind: handout.kind,
        visibility: handout.visibility,
        content: isFileHandout(handout) ? null : handout.content,
        storedFile: isFileHandout(handout) ? handout.file : null,
      }}
      submitLabel="Save"
      busyLabel="Saving..."
      pending={edit.isPending}
      failureMessage={failureMessageFor(edit.error)}
      serverErrors={validationError?.fieldErrors}
      autoFocusTitle
      cancel={
        <Button type="button" variant="outline" onClick={() => onDone(false)}>
          Cancel
        </Button>
      }
      onSubmit={(input) => edit.mutate(input, { onSuccess: () => onDone(true) })}
    />
  )
}

interface HandoutViewProps {
  owner: HandoutOwner
  context: HandoutOwnerContext
  handout: Handout
  editButtonRef: RefObject<HTMLButtonElement | null>
  headingRef: RefObject<HTMLHeadingElement | null>
  onEdit: () => void
}

function HandoutView({ owner, context, handout, editButtonRef, headingRef, onEdit }: HandoutViewProps) {
  return (
    <>
      <HandoutContent handout={handout} owner={owner} />
      {context.canChange ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button ref={editButtonRef} type="button" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          {context.canDelete ? (
            <DeleteHandoutControl owner={owner} context={context} handout={handout} headingRef={headingRef} />
          ) : (
            <p className="text-sm text-muted-foreground">{context.lockedMessage}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{context.lockedMessage}</p>
      )}
    </>
  )
}

interface DeleteHandoutControlProps {
  owner: HandoutOwner
  context: HandoutOwnerContext
  handout: Handout
  headingRef: RefObject<HTMLHeadingElement | null>
}

function DeleteHandoutControl({ owner, context, handout, headingRef }: DeleteHandoutControlProps) {
  const [open, setOpen] = useState(false)
  const deletion = useDeleteHandout(owner, handout.id)
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closedAfterRefusal = useRef(false)
  const refused = deletion.error instanceof HandoutNotDeletableError

  const close = () => {
    closedAfterRefusal.current = refused
    setOpen(false)
    if (refused) {
      context.refetchOwner()
    }
    deletion.reset()
  }

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        className="text-destructive"
        onClick={() => {
          deletion.reset()
          setOpen(true)
        }}
      >
        Delete Handout
      </Button>
      <DeleteHandoutDialog
        open={open}
        handoutTitle={handout.title}
        pending={deletion.isPending}
        failed={deletion.isError && !refused}
        refused={refused}
        refusedMessage={context.deleteRefusedMessage}
        onConfirm={() =>
          deletion.mutate(undefined, {
            onSuccess: () =>
              void navigate({
                ...describeHandoutOwner(owner).ownerPage,
                state: { statusMessage: `${handout.title} deleted.`, focusHandoutsHeading: true },
              }),
          })
        }
        onCancel={close}
        onCloseAutoFocus={(event) => {
          // After a refusal "Delete Handout" is about to go, so focus goes to the h1, which stays.
          event.preventDefault()
          ;(closedAfterRefusal.current ? headingRef.current : (buttonRef.current ?? headingRef.current))?.focus()
        }}
      />
    </>
  )
}
