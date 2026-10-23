import { Link, useNavigate } from '@tanstack/react-router'

import { useCampaign } from '@/campaign-play/hooks/useCampaign'
import '@/campaign-play/types/navigationState'
import { ItemForm } from '@/scenario-preparation/components/item-form/item-form'
import { ItemNotFound } from '@/scenario-preparation/components/item-not-found/item-not-found'
import { useCreateItem } from '@/scenario-preparation/hooks/useItems'
import { ItemValidationError } from '@/scenario-preparation/services/itemApi'
import type { ItemFormValues } from '@/scenario-preparation/types/Item'
import { buttonVariants } from '@/shared/components/ui/button'

const EMPTY_ITEM: ItemFormValues = { name: '', playerFacingDescription: null, keeperNotes: null }

interface CreateItemPageProps {
  campaignId: string
}

/**
 * "Create Item" (specs/scenario-preparation/ux.md section 62): a name, a Player-facing description, and optional Keeper notes.
 * A Player sees the not-found page and no request is made. Success opens the new Item with "Item created.".
 */
export function CreateItemPage({ campaignId }: CreateItemPageProps) {
  const campaign = useCampaign(campaignId)
  const creating = useCreateItem(campaignId)
  const navigate = useNavigate()

  if (campaign.data?.role !== 'Keeper') {
    return <ItemNotFound campaignId={campaignId} />
  }

  const validationError = creating.error instanceof ItemValidationError ? creating.error : null
  const failed = creating.isError && !validationError

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Create Item</h1>
      <ItemForm
        initialValues={EMPTY_ITEM}
        submitLabel="Create"
        busyLabel="Creating..."
        pending={creating.isPending}
        failureMessage={failed ? "We couldn't create the Item. Try again." : null}
        serverErrors={validationError?.fieldErrors}
        cancel={
          <Link to="/campaigns/$campaignId/items" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'px-0' })}>
            Cancel
          </Link>
        }
        onSubmit={(input) =>
          creating.mutate(input, {
            onSuccess: (item) =>
              void navigate({
                to: '/campaigns/$campaignId/items/$itemId',
                params: { campaignId, itemId: item.id },
                state: { statusMessage: 'Item created.' },
              }),
          })
        }
      />
    </div>
  )
}
