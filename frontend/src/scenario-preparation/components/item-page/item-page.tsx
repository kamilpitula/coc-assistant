import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { DeleteItemDialog } from '@/scenario-preparation/components/delete-item-dialog/delete-item-dialog'
import { HandoutSection } from '@/scenario-preparation/components/handout-section/handout-section'
import { ItemForm } from '@/scenario-preparation/components/item-form/item-form'
import { ItemNotFound } from '@/scenario-preparation/components/item-not-found/item-not-found'
import { ItemScenesSection } from '@/scenario-preparation/components/item-scenes-section/item-scenes-section'
import { useDeleteItem, useEditItem, useItem } from '@/scenario-preparation/hooks/useItems'
import { ItemNotDeletableError, ItemNotFoundError, ItemValidationError } from '@/scenario-preparation/services/itemApi'
import type { Item } from '@/scenario-preparation/types/Item'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { Button, buttonVariants } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { isEmptyRichText } from '@/shared/services/richText'

interface ItemPageProps {
  campaignId: string
  itemId: string
}

/**
 * One Item for its Keeper: a view with "Edit" and "Delete Item", or the whole-Item form (specs/scenario-preparation/ux.md section 63).
 * A Player, an unknown id, and another Campaign's id all get the not-found page; a Player's client makes no request.
 */
export function ItemPage({ campaignId, itemId }: ItemPageProps) {
  const campaign = useCampaign(campaignId)
  const isKeeper = campaign.data?.role === 'Keeper'
  const item = useItem(campaignId, itemId, isKeeper)
  const edit = useEditItem(campaignId, itemId)

  if (!isKeeper || item.data === null || edit.error instanceof ItemNotFoundError) {
    return <ItemNotFound campaignId={campaignId} />
  }

  if (item.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Item.</p>
        <Button type="button" variant="outline" onClick={() => void item.refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!item.data) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <ItemDetail
      key={item.data.id}
      campaignId={campaignId}
      item={item.data}
      itemUpdatedAt={item.dataUpdatedAt}
      edit={edit}
      onRefetch={() => void item.refetch()}
    />
  )
}

interface ItemDetailProps {
  campaignId: string
  item: Item
  itemUpdatedAt: number
  edit: ReturnType<typeof useEditItem>
  onRefetch: () => void
}

function ItemDetail({ campaignId, item, itemUpdatedAt, edit, onRefetch }: ItemDetailProps) {
  const navigationMessage = useRouterState({ select: (state) => state.location.state.statusMessage })
  const focusHandoutId = useRouterState({ select: (state) => state.location.state.focusHandoutId })
  const focusHandoutsHeading = useRouterState({ select: (state) => state.location.state.focusHandoutsHeading })
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

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link to="/campaigns/$campaignId/items" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'self-start px-0' })}>
        <ArrowLeft aria-hidden="true" />
        Back to Items
      </Link>
      <p role="status" className="text-sm empty:hidden">
        {justSaved ? 'Item saved.' : navigationMessage}
      </p>
      <div className="flex flex-col gap-2">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold break-words outline-none">
          {item.name}
        </h1>
        <p className="text-sm text-muted-foreground">Held by no one.</p>
      </div>
      {isEditing ? (
        <EditItemForm item={item} edit={edit} onDone={stopEditing} />
      ) : (
        <ItemView
          campaignId={campaignId}
          item={item}
          itemUpdatedAt={itemUpdatedAt}
          editButtonRef={editButtonRef}
          headingRef={headingRef}
          focusHandoutId={focusHandoutId}
          focusHandoutsHeading={focusHandoutsHeading}
          onEdit={startEditing}
          onRefetch={onRefetch}
        />
      )}
    </div>
  )
}

interface EditItemFormProps {
  item: Item
  edit: ReturnType<typeof useEditItem>
  onDone: (saved: boolean) => void
}

function EditItemForm({ item, edit, onDone }: EditItemFormProps) {
  const validationError = edit.error instanceof ItemValidationError ? edit.error : null
  const failed = edit.isError && !validationError

  return (
    <ItemForm
      initialValues={{ name: item.name, playerFacingDescription: item.playerFacingDescription, keeperNotes: item.keeperNotes }}
      submitLabel="Save"
      busyLabel="Saving..."
      pending={edit.isPending}
      failureMessage={failed ? "We couldn't save the Item. Try again." : null}
      serverErrors={validationError?.fieldErrors}
      autoFocusName
      cancel={
        <Button type="button" variant="outline" onClick={() => onDone(false)}>
          Cancel
        </Button>
      }
      onSubmit={(input) => edit.mutate(input, { onSuccess: () => onDone(true) })}
    />
  )
}

interface ItemViewProps {
  campaignId: string
  item: Item
  itemUpdatedAt: number
  editButtonRef: RefObject<HTMLButtonElement | null>
  headingRef: RefObject<HTMLHeadingElement | null>
  focusHandoutId: string | undefined
  focusHandoutsHeading: boolean | undefined
  onEdit: () => void
  onRefetch: () => void
}

function ItemView({ campaignId, item, itemUpdatedAt, editButtonRef, headingRef, focusHandoutId, focusHandoutsHeading, onEdit, onRefetch }: ItemViewProps) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Player-facing description</h2>
        <RichTextView document={item.playerFacingDescription} headingOffset={0} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Keeper notes</h2>
        {item.keeperNotes && !isEmptyRichText(item.keeperNotes) ? (
          <RichTextView document={item.keeperNotes} headingOffset={0} />
        ) : (
          <p className="text-sm text-muted-foreground">No Keeper notes yet.</p>
        )}
      </section>
      <HandoutSection
        owner={{ type: 'item', campaignId, itemId: item.id }}
        canChange
        handouts={item.handouts}
        ownerUpdatedAt={itemUpdatedAt}
        focusHandoutId={focusHandoutId}
        focusHeading={focusHandoutsHeading}
      />
      <ItemScenesSection campaignId={campaignId} scenes={item.scenes} />
      <div className="flex flex-wrap items-center gap-3">
        <Button ref={editButtonRef} type="button" variant="outline" onClick={onEdit}>
          Edit
        </Button>
        <DeleteItemControl campaignId={campaignId} item={item} headingRef={headingRef} onRefetch={onRefetch} />
      </div>
    </>
  )
}

interface DeleteItemControlProps {
  campaignId: string
  item: Item
  headingRef: RefObject<HTMLHeadingElement | null>
  onRefetch: () => void
}

function DeleteItemControl({ campaignId, item, headingRef, onRefetch }: DeleteItemControlProps) {
  const [open, setOpen] = useState(false)
  const deletion = useDeleteItem(campaignId, item.id)
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const refusal = deletion.error instanceof ItemNotDeletableError ? deletion.error : null

  const close = () => {
    setOpen(false)
    if (refusal) {
      onRefetch()
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
        Delete Item
      </Button>
      <DeleteItemDialog
        open={open}
        name={item.name}
        pending={deletion.isPending}
        failed={deletion.isError && !refusal}
        refusedBecause={refusal?.reason ?? null}
        onConfirm={() =>
          deletion.mutate(undefined, {
            onSuccess: () =>
              void navigate({
                to: '/campaigns/$campaignId/items',
                params: { campaignId },
                state: { statusMessage: `${item.name} deleted.` },
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
