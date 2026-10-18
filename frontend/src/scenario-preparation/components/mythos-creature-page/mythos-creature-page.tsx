import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useRef, useState } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { DeleteNonPlayerEntityDialog } from '@/scenario-preparation/components/delete-non-player-entity-dialog/delete-non-player-entity-dialog'
import { NonPlayerEntityNotFound } from '@/scenario-preparation/components/non-player-entity-not-found/non-player-entity-not-found'
import { useDeleteMythosCreature, useMythosCreature } from '@/scenario-preparation/hooks/useNonPlayerEntities'
import type { MythosCreature } from '@/scenario-preparation/types/MythosCreature'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface MythosCreaturePageProps {
  campaignId: string
  mythosCreatureId: string
}

/**
 * One Mythos Creature for its Keeper (specs/scenario-preparation/ux.md section 25). A Player, an unknown id, another
 * Campaign's id, and the other type's id all get the not-found page; a Player's client makes no request.
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

  return <MythosCreatureDetail campaignId={campaignId} mythosCreature={mythosCreature.data} />
}

interface MythosCreatureDetailProps {
  campaignId: string
  mythosCreature: MythosCreature
}

function MythosCreatureDetail({ campaignId, mythosCreature }: MythosCreatureDetailProps) {
  const navigationMessage = useRouterState({ select: (state) => state.location.state.statusMessage })

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
        {navigationMessage}
      </p>
      <h1 className="text-2xl font-semibold break-words">{mythosCreature.name}</h1>
      <ProfileActions campaignId={campaignId} mythosCreature={mythosCreature} />
    </div>
  )
}

function ProfileActions({ campaignId, mythosCreature }: MythosCreatureDetailProps) {
  const [open, setOpen] = useState(false)
  const deletion = useDeleteMythosCreature(campaignId, mythosCreature.id)
  const navigate = useNavigate()
  const deleteButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="flex flex-wrap items-center gap-3">
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
        failed={deletion.isError}
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
          deleteButtonRef.current?.focus()
        }}
      />
    </div>
  )
}
