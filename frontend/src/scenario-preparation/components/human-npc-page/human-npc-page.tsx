import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { DeleteNonPlayerEntityDialog } from '@/scenario-preparation/components/delete-non-player-entity-dialog/delete-non-player-entity-dialog'
import { HumanNpcForm } from '@/scenario-preparation/components/human-npc-form/human-npc-form'
import { HumanNpcView } from '@/scenario-preparation/components/human-npc-view/human-npc-view'
import { NonPlayerEntityNotFound } from '@/scenario-preparation/components/non-player-entity-not-found/non-player-entity-not-found'
import { useDeleteHumanNpc, useEditHumanNpc, useHumanNpc } from '@/scenario-preparation/hooks/useNonPlayerEntities'
import { HumanNpcValidationError } from '@/scenario-preparation/services/humanNpcApi'
import type { HumanNpc } from '@/scenario-preparation/types/HumanNpc'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface HumanNpcPageProps {
  campaignId: string
  humanNpcId: string
}

/**
 * One Human NPC for its Keeper: a view with "Edit" and "Delete", or the whole-profile form (specs/scenario-preparation/ux.md
 * section 25). A Player, an unknown id, another Campaign's id, and the other type's id all get the not-found page; a
 * Player's client makes no request.
 */
export function HumanNpcPage({ campaignId, humanNpcId }: HumanNpcPageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const humanNpc = useHumanNpc(campaignId, humanNpcId, isKeeper)

  if (!isKeeper || humanNpc.data === null) {
    return <NonPlayerEntityNotFound campaignId={campaignId} />
  }

  if (humanNpc.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Human NPC.</p>
        <Button type="button" variant="outline" onClick={() => void humanNpc.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!humanNpc.data) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return <HumanNpcDetail campaignId={campaignId} humanNpc={humanNpc.data} />
}

interface HumanNpcDetailProps {
  campaignId: string
  humanNpc: HumanNpc
}

function HumanNpcDetail({ campaignId, humanNpc }: HumanNpcDetailProps) {
  const navigationMessage = useRouterState({ select: (state) => state.location.state.statusMessage })
  const edit = useEditHumanNpc(campaignId, humanNpc.id)
  const [isEditing, setIsEditing] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [returnedFromEdit, setReturnedFromEdit] = useState(false)
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

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

  const validationError = edit.error instanceof HumanNpcValidationError ? edit.error : null
  const failureMessage = edit.isError && !validationError ? "We couldn't save the Human NPC. Try again." : null

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
        {justSaved ? 'Human NPC saved.' : navigationMessage}
      </p>
      {isEditing ? (
        <>
          <h1 className="text-2xl font-semibold break-words">{humanNpc.name}</h1>
          <HumanNpcForm
            campaignId={campaignId}
            humanNpc={humanNpc}
            pending={edit.isPending}
            problems={validationError?.problems ?? []}
            failureMessage={failureMessage}
            onSubmit={(input) => edit.mutate(input, { onSuccess: () => stopEditing(true) })}
            onCancel={() => stopEditing(false)}
          />
        </>
      ) : (
        <>
          <HumanNpcView ref={headingRef} humanNpc={humanNpc} />
          <ProfileActions campaignId={campaignId} humanNpc={humanNpc} editButtonRef={editButtonRef} headingRef={headingRef} onEdit={startEditing} />
        </>
      )}
    </div>
  )
}

interface ProfileActionsProps {
  campaignId: string
  humanNpc: HumanNpc
  editButtonRef: RefObject<HTMLButtonElement | null>
  headingRef: RefObject<HTMLHeadingElement | null>
  onEdit: () => void
}

function ProfileActions({ campaignId, humanNpc, editButtonRef, headingRef, onEdit }: ProfileActionsProps) {
  const [open, setOpen] = useState(false)
  const deletion = useDeleteHumanNpc(campaignId, humanNpc.id)
  const navigate = useNavigate()
  const deleteButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button ref={editButtonRef} type="button" variant="outline" onClick={onEdit}>
        Edit
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
        name={humanNpc.name}
        pending={deletion.isPending}
        failed={deletion.isError}
        onConfirm={() =>
          deletion.mutate(undefined, {
            onSuccess: () =>
              void navigate({
                to: '/campaigns/$campaignId/non-player-entities',
                params: { campaignId },
                state: { statusMessage: `${humanNpc.name} deleted.` },
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
  )
}
