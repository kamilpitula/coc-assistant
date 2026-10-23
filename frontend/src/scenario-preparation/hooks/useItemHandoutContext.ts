import { useItem } from '@/scenario-preparation/hooks/useItems'
import type { ItemHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { itemHandoutContext } from '@/scenario-preparation/services/handoutOwnerContext'

/**
 * The Item that owns the Handouts on a screen, with what the Handouts may do now. `item` is the Item query, so the caller can
 * show its loading, error, and not-found states; `context` is null until the Item has loaded. Enabled only for the Keeper.
 */
export function useItemHandoutContext(owner: ItemHandoutOwner, enabled: boolean) {
  const item = useItem(owner.campaignId, owner.itemId, enabled)
  const context = item.data ? itemHandoutContext(item.data, () => void item.refetch()) : null

  return { item, context }
}
