import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { DeleteHandoutDialog } from '@/scenario-preparation/components/delete-handout-dialog/delete-handout-dialog'
import { HandoutBadges } from '@/scenario-preparation/components/handout-badges/handout-badges'
import { HandoutContent } from '@/scenario-preparation/components/handout-content/handout-content'
import { HandoutForm } from '@/scenario-preparation/components/handout-form/handout-form'
import { HandoutNotFound } from '@/scenario-preparation/components/handout-not-found/handout-not-found'
import { SceneNotFound } from '@/scenario-preparation/components/scene-not-found/scene-not-found'
import { useDeleteHandout, useEditHandout, useHandout } from '@/scenario-preparation/hooks/useHandouts'
import { useScene } from '@/scenario-preparation/hooks/useScenes'
import { HandoutNotDeletableError, HandoutNotFoundError, HandoutValidationError } from '@/scenario-preparation/services/handoutApi'
import { HANDOUT_SCENE_FINISHED_MEANWHILE } from '@/scenario-preparation/services/handoutForm'
import { SceneFinishedError } from '@/scenario-preparation/services/sceneApi'
import { isFileHandout, type Handout } from '@/scenario-preparation/types/Handout'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface HandoutPageProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  handoutId: string
}

/**
 * One Handout for its Keeper: a view with "Edit" and "Delete Handout" while the Scene is Prepared, "Edit" while Active, and
 * neither once Finished (specs/scenario-preparation/ux.md section 42). A Player and an unknown Scene get the Scene not-found
 * page and make no request; an unknown Handout, or a 404 on save, gets the Handout not-found page.
 */
export function HandoutPage({ campaignId, scenarioId, sceneId, handoutId }: HandoutPageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const scene = useScene(campaignId, scenarioId, sceneId, isKeeper)
  const handout = useHandout(campaignId, scenarioId, sceneId, handoutId, isKeeper)
  const edit = useEditHandout(campaignId, scenarioId, sceneId, handoutId)

  if (!isKeeper || scene.data === null) {
    return <SceneNotFound campaignId={campaignId} />
  }

  if (handout.data === null || edit.error instanceof HandoutNotFoundError) {
    return <HandoutNotFound campaignId={campaignId} scenarioId={scenarioId} sceneId={sceneId} />
  }

  if (scene.isError || handout.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Handout.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void scene.refetch()
            void handout.refetch()
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  if (!scene.data || !handout.data) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <HandoutDetail
      campaignId={campaignId}
      scenarioId={scenarioId}
      scene={scene.data}
      handout={handout.data}
      edit={edit}
      onRefetchScene={() => void scene.refetch()}
    />
  )
}

type FocusTarget = 'edit' | 'heading'

interface HandoutDetailProps {
  campaignId: string
  scenarioId: string
  scene: Scene
  handout: Handout
  edit: ReturnType<typeof useEditHandout>
  onRefetchScene: () => void
}

function HandoutDetail({ campaignId, scenarioId, scene, handout, edit, onRefetchScene }: HandoutDetailProps) {
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
      onRefetchScene()
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId"
        params={{ campaignId, scenarioId, sceneId: scene.id }}
        className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}
      >
        <ArrowLeft aria-hidden="true" />
        Back to the Scene
      </Link>
      <p role="status" className="text-sm empty:hidden">
        {justSaved ? 'Handout saved.' : null}
      </p>
      <div className="flex flex-col gap-2">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold break-words outline-none">
          {handout.title}
        </h1>
        <p className="text-sm break-words text-muted-foreground">Scene: {scene.title}</p>
        <HandoutBadges kind={handout.kind} visibility={handout.visibility} />
      </div>
      {isEditing ? (
        <EditHandoutForm handout={handout} edit={edit} onDone={stopEditing} />
      ) : (
        <HandoutView
          campaignId={campaignId}
          scenarioId={scenarioId}
          scene={scene}
          handout={handout}
          editButtonRef={editButtonRef}
          headingRef={headingRef}
          onEdit={startEditing}
          onRefetchScene={onRefetchScene}
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
  campaignId: string
  scenarioId: string
  scene: Scene
  handout: Handout
  editButtonRef: RefObject<HTMLButtonElement | null>
  headingRef: RefObject<HTMLHeadingElement | null>
  onEdit: () => void
  onRefetchScene: () => void
}

function HandoutView({ campaignId, scenarioId, scene, handout, editButtonRef, headingRef, onEdit, onRefetchScene }: HandoutViewProps) {
  return (
    <>
      <HandoutContent handout={handout} campaignId={campaignId} scenarioId={scenarioId} sceneId={scene.id} />
      {scene.status === 'Finished' ? (
        <p className="text-sm text-muted-foreground">This Scene is finished and can&apos;t be changed.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button ref={editButtonRef} type="button" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          {scene.status === 'Prepared' ? (
            <DeleteHandoutControl
              campaignId={campaignId}
              scenarioId={scenarioId}
              sceneId={scene.id}
              handout={handout}
              headingRef={headingRef}
              onRefetchScene={onRefetchScene}
            />
          ) : (
            <p className="text-sm text-muted-foreground">This Scene has been started, so its Handouts can&apos;t be deleted.</p>
          )}
        </div>
      )}
    </>
  )
}

interface DeleteHandoutControlProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  handout: Handout
  headingRef: RefObject<HTMLHeadingElement | null>
  onRefetchScene: () => void
}

function DeleteHandoutControl({ campaignId, scenarioId, sceneId, handout, headingRef, onRefetchScene }: DeleteHandoutControlProps) {
  const [open, setOpen] = useState(false)
  const deletion = useDeleteHandout(campaignId, scenarioId, sceneId, handout.id)
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const closedAfterRefusal = useRef(false)
  const refused = deletion.error instanceof HandoutNotDeletableError

  const close = () => {
    closedAfterRefusal.current = refused
    setOpen(false)
    if (refused) {
      onRefetchScene()
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
        onConfirm={() =>
          deletion.mutate(undefined, {
            onSuccess: () =>
              void navigate({
                to: '/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId',
                params: { campaignId, scenarioId, sceneId },
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
