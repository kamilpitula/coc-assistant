import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { HandoutSection } from '@/scenario-preparation/components/handout-section/handout-section'
import { SceneItemSection } from '@/scenario-preparation/components/scene-item-section/scene-item-section'
import { SceneLinkSection } from '@/scenario-preparation/components/scene-link-section/scene-link-section'
import { RemoveSceneDialog } from '@/scenario-preparation/components/remove-scene-dialog/remove-scene-dialog'
import { SceneForm } from '@/scenario-preparation/components/scene-form/scene-form'
import { SceneNotFound } from '@/scenario-preparation/components/scene-not-found/scene-not-found'
import { SceneStatusBadge } from '@/scenario-preparation/components/scene-status-badge/scene-status-badge'
import { SceneTimes } from '@/scenario-preparation/components/scene-times/scene-times'
import { useEditScene, useRemoveScene, useScene } from '@/scenario-preparation/hooks/useScenes'
import { SceneFinishedError, SceneNotRemovableError, SceneValidationError } from '@/scenario-preparation/services/sceneApi'
import type { Scene } from '@/scenario-preparation/types/Scene'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { isEmptyRichText } from '@/shared/services/richText'

interface ScenePageProps {
  campaignId: string
  scenarioId: string
  sceneId: string
}

/**
 * One Scene for its Keeper: a view with "Edit" and "Remove Scene" while Prepared, "Edit" while Active, and neither
 * once Finished (specs/scenario-preparation/ux.md section 14). A Player, an unknown id, and another Scenario's or
 * Campaign's id all get the not-found page; a Player's client makes no request.
 */
export function ScenePage({ campaignId, scenarioId, sceneId }: ScenePageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const scene = useScene(campaignId, scenarioId, sceneId, isKeeper)

  if (!isKeeper || scene.data === null) {
    return <SceneNotFound campaignId={campaignId} />
  }

  if (scene.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Scene.</p>
        <Button type="button" variant="outline" onClick={() => void scene.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!scene.data) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <SceneDetail
      campaignId={campaignId}
      scenarioId={scenarioId}
      scene={scene.data}
      sceneUpdatedAt={scene.dataUpdatedAt}
      onRefetch={() => void scene.refetch()}
    />
  )
}

interface SceneDetailProps {
  campaignId: string
  scenarioId: string
  scene: Scene
  sceneUpdatedAt: number
  onRefetch: () => void
}

function SceneDetail({ campaignId, scenarioId, scene, sceneUpdatedAt, onRefetch }: SceneDetailProps) {
  const navigationMessage = useRouterState({ select: (state) => state.location.state.statusMessage })
  const focusLinkId = useRouterState({ select: (state) => state.location.state.focusLinkId })
  const focusItemLinkId = useRouterState({ select: (state) => state.location.state.focusItemLinkId })
  const focusHandoutId = useRouterState({ select: (state) => state.location.state.focusHandoutId })
  const focusHandoutsHeading = useRouterState({ select: (state) => state.location.state.focusHandoutsHeading })
  const edit = useEditScene(campaignId, scenarioId, scene.id)
  const [isEditing, setIsEditing] = useState(false)
  const [unlinkedMessage, setUnlinkedMessage] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [returnedFromEdit, setReturnedFromEdit] = useState(false)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // The Edit button is mounted again when the form closes, so focus goes back to it; a Scene finished meanwhile has none.
  useEffect(() => {
    if (!isEditing && returnedFromEdit) {
      ;(editButtonRef.current ?? headingRef.current)?.focus()
    }
  }, [isEditing, returnedFromEdit])

  const startEditing = () => {
    edit.reset()
    setJustSaved(false)
    setUnlinkedMessage(null)
    setReturnedFromEdit(false)
    setIsEditing(true)
  }

  const stopEditing = (saved: boolean) => {
    setJustSaved(saved)
    setUnlinkedMessage(null)
    setReturnedFromEdit(true)
    setIsEditing(false)
    if (!saved && edit.error instanceof SceneFinishedError) {
      onRefetch()
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        to="/campaigns/$campaignId/scenarios/$scenarioId"
        params={{ campaignId, scenarioId }}
        className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}
      >
        <ArrowLeft aria-hidden="true" />
        Back to the Scenario
      </Link>
      <p role="status" className="text-sm empty:hidden">
        {unlinkedMessage ?? (justSaved ? 'Scene saved.' : navigationMessage)}
      </p>
      <div className="flex flex-col gap-2">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold break-words outline-none">
          {scene.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SceneStatusBadge status={scene.status} />
          <SceneTimes startedAt={scene.startedAt} finishedAt={scene.finishedAt} />
        </div>
      </div>
      {isEditing ? (
        <EditSceneForm scene={scene} edit={edit} onDone={stopEditing} />
      ) : (
        <SceneView
          campaignId={campaignId}
          scenarioId={scenarioId}
          scene={scene}
          sceneUpdatedAt={sceneUpdatedAt}
          editButtonRef={editButtonRef}
          headingRef={headingRef}
          focusLinkId={focusLinkId}
          focusItemLinkId={focusItemLinkId}
          focusHandoutId={focusHandoutId}
          focusHandoutsHeading={focusHandoutsHeading}
          onEdit={startEditing}
          onUnlinked={(name) => setUnlinkedMessage(`${name} unlinked.`)}
          onRefetch={onRefetch}
        />
      )}
    </div>
  )
}

interface EditSceneFormProps {
  scene: Scene
  edit: ReturnType<typeof useEditScene>
  onDone: (saved: boolean) => void
}

const FINISHED_MEANWHILE = "This Scene has been finished, so it can't be changed. Copy anything you need, then select Cancel."

function failureMessageFor(error: unknown): string | null {
  if (!error || error instanceof SceneValidationError) {
    return null
  }
  return error instanceof SceneFinishedError ? FINISHED_MEANWHILE : "We couldn't save the Scene. Try again."
}

function EditSceneForm({ scene, edit, onDone }: EditSceneFormProps) {
  const validationError = edit.error instanceof SceneValidationError ? edit.error : null

  return (
    <SceneForm
      initialValues={{ title: scene.title, location: scene.location, keeperNotes: scene.keeperNotes }}
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
      onSubmit={(values) => edit.mutate(values, { onSuccess: () => onDone(true) })}
    />
  )
}

interface SceneViewProps {
  campaignId: string
  scenarioId: string
  scene: Scene
  sceneUpdatedAt: number
  editButtonRef: RefObject<HTMLButtonElement | null>
  headingRef: RefObject<HTMLHeadingElement | null>
  focusLinkId: string | undefined
  focusItemLinkId: string | undefined
  focusHandoutId: string | undefined
  focusHandoutsHeading: boolean | undefined
  onEdit: () => void
  onUnlinked: (playerFacingName: string) => void
  onRefetch: () => void
}

function SceneView({
  campaignId,
  scenarioId,
  scene,
  sceneUpdatedAt,
  editButtonRef,
  headingRef,
  focusLinkId,
  focusItemLinkId,
  focusHandoutId,
  focusHandoutsHeading,
  onEdit,
  onUnlinked,
  onRefetch,
}: SceneViewProps) {
  return (
    <>
      {scene.location !== '' && (
        <dl className="flex flex-wrap gap-x-3 text-sm">
          <dt className="font-medium">Location</dt>
          <dd className="break-words">{scene.location}</dd>
        </dl>
      )}
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Keeper notes</h2>
        {scene.keeperNotes && !isEmptyRichText(scene.keeperNotes) ? (
          <RichTextView document={scene.keeperNotes} />
        ) : (
          <p className="text-sm text-muted-foreground">No Keeper notes yet.</p>
        )}
      </section>
      <HandoutSection
        owner={{ type: 'scene', campaignId, scenarioId, sceneId: scene.id }}
        canChange={scene.status !== 'Finished'}
        handouts={scene.handouts}
        ownerUpdatedAt={sceneUpdatedAt}
        focusHandoutId={focusHandoutId}
        focusHeading={focusHandoutsHeading}
      />
      <SceneLinkSection
        campaignId={campaignId}
        scenarioId={scenarioId}
        sceneId={scene.id}
        status={scene.status}
        links={scene.nonPlayerEntityLinks}
        focusLinkId={focusLinkId}
        onUnlinked={onUnlinked}
        onRefetch={onRefetch}
      />
      <SceneItemSection
        campaignId={campaignId}
        scenarioId={scenarioId}
        sceneId={scene.id}
        status={scene.status}
        links={scene.itemLinks}
        focusLinkId={focusItemLinkId}
        onUnlinked={onUnlinked}
        onRefetch={onRefetch}
      />
      {scene.status === 'Finished' ? (
        <p className="text-sm text-muted-foreground">This Scene is finished and can&apos;t be changed.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <SceneRunLink campaignId={campaignId} scenarioId={scenarioId} sceneId={scene.id} status={scene.status} />
          <Button ref={editButtonRef} type="button" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          {scene.status === 'Prepared' && (
            <RemoveSceneControl
              campaignId={campaignId}
              scenarioId={scenarioId}
              scene={scene}
              headingRef={headingRef}
              onRefetch={onRefetch}
            />
          )}
        </div>
      )}
    </>
  )
}

interface SceneRunLinkProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  status: Scene['status']
}

/** "Start Scene" for a Prepared Scene and "Open Active Scene" for an Active one, before "Edit" (specs/scene-play/ux.md section 1; SPL-UX-1). */
function SceneRunLink({ campaignId, scenarioId, sceneId, status }: SceneRunLinkProps) {
  if (status === 'Prepared') {
    return (
      <Link
        to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/start"
        params={{ campaignId, scenarioId, sceneId }}
        className={buttonVariants()}
      >
        Start Scene
      </Link>
    )
  }

  return (
    <Link to="/campaigns/$campaignId/active-scene" params={{ campaignId }} className={buttonVariants({ variant: 'outline' })}>
      Open Active Scene
    </Link>
  )
}

interface RemoveSceneControlProps {
  campaignId: string
  scenarioId: string
  scene: Scene
  headingRef: RefObject<HTMLHeadingElement | null>
  onRefetch: () => void
}

function RemoveSceneControl({ campaignId, scenarioId, scene, headingRef, onRefetch }: RemoveSceneControlProps) {
  const [open, setOpen] = useState(false)
  const removal = useRemoveScene(campaignId, scenarioId, scene.id)
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const refused = removal.error instanceof SceneNotRemovableError

  const close = () => {
    setOpen(false)
    if (refused) {
      onRefetch()
    }
    removal.reset()
  }

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        className="text-destructive"
        onClick={() => {
          removal.reset()
          setOpen(true)
        }}
      >
        Remove Scene
      </Button>
      <RemoveSceneDialog
        open={open}
        sceneTitle={scene.title}
        pending={removal.isPending}
        failed={removal.isError && !refused}
        refused={refused}
        onConfirm={() =>
          removal.mutate(undefined, {
            onSuccess: () =>
              void navigate({
                to: '/campaigns/$campaignId/scenarios/$scenarioId',
                params: { campaignId, scenarioId },
                state: { statusMessage: 'Scene removed.' },
              }),
          })
        }
        onCancel={close}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          ;(buttonRef.current ?? headingRef.current)?.focus()
        }}
      />
    </>
  )
}
