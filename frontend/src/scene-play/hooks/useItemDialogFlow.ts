import { useRef, useState } from 'react'

/** The dialog opener knows the element ids to try in order when the trigger is gone (specs/scene-play/ux.md section 21.7). */
export interface ItemDialogContext {
  fallbackIds: string[]
}

/** A dialog request names the button that opened it, so focus can return there. */
export interface ItemDialogRequest {
  triggerId: string
}

/**
 * The open/cancel/focus core the give and take-back dialog flows share: which request is open, the mutation reset on
 * open and cancel, and focus that falls back through the opener's ids and never lands on body.
 */
export function useItemDialogFlow<Request extends ItemDialogRequest>(reset: () => void) {
  const [request, setRequest] = useState<Request | null>(null)
  const triggerId = useRef<string | null>(null)
  const context = useRef<ItemDialogContext>({ fallbackIds: [] })

  const open = (next: Request, nextContext: ItemDialogContext = { fallbackIds: [] }) => {
    reset()
    triggerId.current = next.triggerId
    context.current = nextContext
    setRequest(next)
  }

  const cancel = () => {
    reset()
    setRequest(null)
  }

  const dismiss = () => {
    setRequest(null)
  }

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

  return { request, open, cancel, dismiss, returnFocus }
}
