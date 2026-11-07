import type { TakeBackItemContext, TakeBackItemRequest } from '@/scene-play/components/take-back-item-dialog/take-back-item-dialog'
import { useTakeBackItem } from '@/scene-play/hooks/useHeldItems'
import { useItemDialogFlow } from '@/scene-play/hooks/useItemDialogFlow'
import { TakeBackConflictError, TakeBackItemNotFoundError } from '@/scene-play/services/itemHolderApi'

/** The message the dialog shows for a failed take-back, or null when there is no error. */
export function takeBackRefusalFor(error: unknown, itemName: string): string | null {
  if (!error) {
    return null
  }
  if (error instanceof TakeBackItemNotFoundError) {
    return `We couldn't find ${itemName}. It may have been deleted.`
  }
  return `We couldn't take ${itemName} back. Try again.`
}

interface TakeBackItemFlowCallbacks {
  /** The page's status message: "{name} taken back from {holder}.". */
  onTakenBack: (message: string) => void
  /** A race: the page refetches the Active Scene (and its Scene). */
  onRefetch: () => void
}

/**
 * The Keeper's take-back dialog flow (specs/scene-play/ux.md section 22.4): which Item is being taken back, the take-back
 * in flight, the refusal to show, and where focus goes when the dialog closes. A race asks the page to refetch and keeps
 * the dialog open.
 */
export function useTakeBackItemFlow(campaignId: string, callbacks: TakeBackItemFlowCallbacks) {
  const takeBack = useTakeBackItem(campaignId)
  const dialog = useItemDialogFlow<TakeBackItemRequest>(() => takeBack.reset())
  const { request } = dialog

  const open = (next: TakeBackItemRequest, nextContext: TakeBackItemContext = { fallbackIds: [] }) => dialog.open(next, nextContext)

  const cancel = () => dialog.cancel()

  const confirm = () => {
    if (!request) {
      return
    }
    const { itemId, itemName, holderName } = request
    takeBack.mutate(itemId, {
      onSuccess: () => {
        dialog.dismiss()
        callbacks.onTakenBack(`${itemName} taken back from ${holderName}.`)
      },
      onError: (error) => {
        if (error instanceof TakeBackConflictError) {
          callbacks.onRefetch()
        }
      },
    })
  }

  /**
   * Focus returns to the "Take back" button that opened the dialog; when the Item left its list the trigger is gone, so
   * focus moves to the entry's "Give..." and then the sub-tab h2, and never lands on body.
   */
  const returnFocus = (event: Event) => dialog.returnFocus(event)

  return { request, open, cancel, confirm, returnFocus, pending: takeBack.isPending, refusal: request ? takeBackRefusalFor(takeBack.error, request.itemName) : null }
}
