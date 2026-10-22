import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { DeleteNonPlayerEntityDialog } from '@/scenario-preparation/components/delete-non-player-entity-dialog/delete-non-player-entity-dialog'
import { MythosCreatureForm } from '@/scenario-preparation/components/mythos-creature-form/mythos-creature-form'
import { MythosCreatureHeading } from '@/scenario-preparation/components/mythos-creature-heading/mythos-creature-heading'
import { MythosCreatureView } from '@/scenario-preparation/components/mythos-creature-view/mythos-creature-view'
import { NonPlayerEntityNotFound } from '@/scenario-preparation/components/non-player-entity-not-found/non-player-entity-not-found'
import { useDeleteMythosCreature, useDuplicateMythosCreature, useEditMythosCreature, useMythosCreature } from '@/scenario-preparation/hooks/useNonPlayerEntities'
import { NonPlayerEntityInUseError, NonPlayerEntityValidationError } from '@/scenario-preparation/services/nonPlayerEntityApi'
import type { MythosCreature } from '@/scenario-preparation/types/MythosCreature'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

const COPY_CREATED_MESSAGE = "Copy created. It isn't part of any Scene."

interface MythosCreaturePageProps {
  campaignId: string
  mythosCreatureId: string
}

/**
 * One Mythos Creature for its Keeper: a view with "Edit", "Duplicate", and "Delete", or the whole-profile form (specs/scenario-
 * preparation/ux.md section 25). A Player, an unknown id, another Campaign's id, and the other type's id all get the
 * not-found page; a Player's client makes no request.
 */
export function MythosCreaturePage({ campaignId, mythosCreatureId }: MythosCreaturePageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const mythosCreature = useMythosCreature(campaignId, mythosCreatureId, isKeeper)

  if (!isKeeper || mythosCreature.data === null) {
    return <NonPlayerEntityNotFound campaignId={campaignId} />
  }

  if (mythosCreature.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Mythos Creature.</p>
        <Button type="button" variant="outline" onClick={() => void mythosCreature.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!mythosCreature.data) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return <MythosCreatureDetail key={mythosCreature.data.id} campaignId={campaignId} mythosCreature={mythosCreature.data} />
}

interface MythosCreatureDetailProps {
  campaignId: string
  mythosCreature: MythosCreature
}

function MythosCreatureDetail({ campaignId, mythosCreature }: MythosCreatureDetailProps) {
  const navigationMessage = useRouterState({ select: (state) => state.location.state.statusMessage })
  const focusHeading = useRouterState({ select: (state) => state.location.state.focusHeading })
  const edit = useEditMythosCreature(campaignId, mythosCreature.id)
  const [isEditing, setIsEditing] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [returnedFromEdit, setReturnedFromEdit] = useState(false)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // A copy opened by Duplicate puts focus on its heading (SP-A11Y-22).
  useEffect(() => {
    if (focusHeading) {
      headingRef.current?.focus()
    }
  }, [focusHeading])

  // The Edit button is mounted again when the form closes, so focus goes back to it.
  useEffect(() => {
    if (!isEditing && returnedFromEdit) {
      ;(editButtonRef.current ?? headingRef.current)?.focus()
    }
  }, [isEditing, returnedFromEdit])

  const startEditing = () => {
    edit.reset()
    setJustSaved(false)
    setReturnedFromEdit(false)
    setIsEditing(true)
  }

  const stopEditing = (saved: boolean) => {
    if (!saved) {
      edit.reset()
    }
    setJustSaved(saved)
    setReturnedFromEdit(true)
    setIsEditing(false)
  }

  const validationError = edit.error instanceof NonPlayerEntityValidationError ? edit.error : null
  const failureMessage = edit.isError && !validationError ? "We couldn't save the Mythos Creature. Try again." : null

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        to="/campaigns/$campaignId/non-player-entities"
        params={{ campaignId }}
        className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}
      >
        <ArrowLeft aria-hidden="true" />
        Back to Non-Player Entities
      </Link>
      <p role="status" className="text-sm empty:hidden">
        {justSaved ? 'Mythos Creature saved.' : navigationMessage}
      </p>
      {isEditing ? (
        <>
          <MythosCreatureHeading name={mythosCreature.name} creatureKind={mythosCreature.details.creatureKind} />
          <MythosCreatureForm
            campaignId={campaignId}
            mythosCreature={mythosCreature}
            pending={edit.isPending}
            problems={validationError?.problems ?? []}
            failureMessage={failureMessage}
            onSubmit={(input) => edit.mutate(input, { onSuccess: () => stopEditing(true) })}
            onCancel={() => stopEditing(false)}
          />
        </>
      ) : (
        <>
          <MythosCreatureView ref={headingRef} mythosCreature={mythosCreature} />
          <ProfileActions campaignId={campaignId} mythosCreature={mythosCreature} editButtonRef={editButtonRef} headingRef={headingRef} onEdit={startEditing} />
        </>
      )}
    </div>
  )
}

interface ProfileActionsProps {
  campaignId: string
  mythosCreature: MythosCreature
  editButtonRef: RefObject<HTMLButtonElement | null>
  headingRef: RefObject<HTMLHeadingElement | null>
  onEdit: () => void
}

function ProfileActions({ campaignId, mythosCreature, editButtonRef, headingRef, onEdit }: ProfileActionsProps) {
  const [open, setOpen] = useState(false)
  const deletion = useDeleteMythosCreature(campaignId, mythosCreature.id)
  const deletionRefused = deletion.error instanceof NonPlayerEntityInUseError
  const duplication = useDuplicateMythosCreature(campaignId, mythosCreature.id)
  const navigate = useNavigate()
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const duplicateButtonRef = useRef<HTMLButtonElement>(null)

  // A disabled button loses focus, so a failed Duplicate gives it back (SP-A11Y-22).
  useEffect(() => {
    if (duplication.isError) {
      duplicateButtonRef.current?.focus()
    }
  }, [duplication.isError])

  const duplicate = () =>
    duplication.mutate(undefined, {
      onSuccess: (copy) =>
        void navigate({
          to: '/campaigns/$campaignId/mythos-creatures/$mythosCreatureId',
          params: { campaignId, mythosCreatureId: copy.id },
          state: { statusMessage: COPY_CREATED_MESSAGE, focusHeading: true },
        }),
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button ref={editButtonRef} type="button" variant="outline" onClick={onEdit}>
          Edit
        </Button>
        <Button ref={duplicateButtonRef} type="button" variant="outline" disabled={duplication.isPending} onClick={duplicate}>
          {duplication.isPending ? 'Duplicating...' : 'Duplicate'}
        </Button>
        <Button
          ref={deleteButtonRef}
          type="button"
          variant="outline"
          className="text-destructive"
          onClick={() => {
            deletion.reset()
            setOpen(true)
          }}
        >
          Delete
        </Button>
        <DeleteNonPlayerEntityDialog
          open={open}
          name={mythosCreature.name}
          pending={deletion.isPending}
          failed={deletion.isError && !deletionRefused}
          refused={deletionRefused}
          onConfirm={() =>
            deletion.mutate(undefined, {
              onSuccess: () =>
                void navigate({
                  to: '/campaigns/$campaignId/non-player-entities',
                  params: { campaignId },
                  state: { statusMessage: `${mythosCreature.name} deleted.` },
                }),
            })
          }
          onCancel={() => {
            setOpen(false)
            deletion.reset()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            ;(deleteButtonRef.current ?? headingRef.current)?.focus()
          }}
        />
      </div>
      {duplication.isError ? (
        <p role="alert" className="text-sm text-destructive">
          We couldn&apos;t duplicate {mythosCreature.name}. Try again.
        </p>
      ) : null}
    </div>
  )
}
