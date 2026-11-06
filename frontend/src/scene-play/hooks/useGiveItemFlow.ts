import { useRef, useState } from 'react'

import type { GiveItemContext, GiveItemRequest } from '@/scene-play/components/give-item-dialog/give-item-dialog'
import { useGiveItem } from '@/scene-play/hooks/useHeldItems'
import { GiveItemConflictError, GiveItemNotFoundError, GiveItemRefusedError } from '@/scene-play/services/itemHolderApi'
import { joinNames, recipientsOfSubject } from '@/scene-play/services/revealPresentation'
import type { InvestigatorPresent } from '@/scene-play/types/ActiveScene'
import type { KeeperReveal } from '@/scene-play/types/Reveal'

/** The message the dialog shows for a failed give, or null when there is no error. */
export function giveRefusalFor(error: unknown, itemName: string): string | null {
  if (!error) {
    return null
  }
  if (error instanceof GiveItemConflictError) {
    return `${itemName} wasn't given: the Scene or the Item changed meanwhile.`
  }
  if (error instanceof GiveItemRefusedError) {
    return error.field === 'itemId'
      ? `${itemName} is no longer part of this Scene.`
      : `That Investigator is no longer present or already holds ${itemName}. Check the list and try again.`
  }
  if (error instanceof GiveItemNotFoundError) {
    return `We couldn't find ${itemName}. It may have been deleted.`
  }
  return `We couldn't give ${itemName}. Try again.`
}

interface GiveItemFlowCallbacks {
  /** The page's status message: "{name} given to {investigator}." plus " Moved to Revealed." when the Item completed. */
  onGiven: (message: string) => void
  /** A race or refusal: the page refetches the Active Scene (and its Scene). */
  onRefetch: () => void
}

/**
 * The Keeper's give dialog flow (specs/scene-play/ux.md sections 22.3 and 21.7): which Item is being given, the give in
 * flight, the refusal to show, and where focus goes when the dialog closes. A race or refusal asks the page to refetch
 * and keeps the dialog open; a give Reveal counts toward "Moved to Revealed.".
 */
export function useGiveItemFlow(
  campaignId: string,
  present: InvestigatorPresent[] = [],
  reveals: KeeperReveal[] = [],
  callbacks: GiveItemFlowCallbacks,
) {
  const give = useGiveItem(campaignId)
  const [request, setRequest] = useState<GiveItemRequest | null>(null)
  const triggerId = useRef<string | null>(null)
  const context = useRef<GiveItemContext>({ fallbackIds: [] })

  const open = (next: GiveItemRequest, nextContext: GiveItemContext = { fallbackIds: [] }) => {
    give.reset()
    triggerId.current = next.triggerId
    context.current = nextContext
    setRequest(next)
  }

  const cancel = () => {
    give.reset()
    setRequest(null)
  }

  const confirm = (investigatorId: string) => {
    if (!request) {
      return
    }
    const names = joinNames(present.filter((investigator) => investigator.id === investigatorId).map((investigator) => investigator.name))
    const received = new Set([...recipientsOfSubject(reveals, request.itemId, present).map((recipient) => recipient.id), investigatorId])
    const completed = present.length > 0 && present.every((investigator) => received.has(investigator.id))
    const itemName = request.itemName
    give.mutate(
      { itemId: request.itemId, investigatorId },
      {
        onSuccess: () => {
          setRequest(null)
          callbacks.onGiven(completed ? `${itemName} given to ${names}. Moved to Revealed.` : `${itemName} given to ${names}.`)
        },
        onError: (error) => {
          if (error instanceof GiveItemConflictError || error instanceof GiveItemRefusedError) {
            callbacks.onRefetch()
          }
        },
      },
    )
  }

  /**
   * Focus returns to the "Give..." button that opened the dialog; when the Item left its list the trigger is gone, so
   * focus moves to the next entry's title, then the previous one, then the sub-tab h2, and never lands on body
   * (SPL-A11Y-17).
   */
  const returnFocus = (event: Event) => {
    event.preventDefault()
    const ids = [triggerId.current, ...context.current.fallbackIds].filter((id): id is string => id !== null)
    for (const id of ids) {
      const element = document.getElementById(id)
      if (element) {
        element.focus()
        return
      }
    }
  }

  return { request, open, cancel, confirm, returnFocus, pending: give.isPending, refusal: request ? giveRefusalFor(give.error, request.itemName) : null }
}
