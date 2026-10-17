import type { UseMutationResult } from '@tanstack/react-query'
import { useEffect, useRef, useState, type RefObject } from 'react'

import {
  focusTargetAfterMove,
  movedAnnouncement,
  moveButtonId,
  moveItem,
  type MoveDirection,
} from '@/scenario-preparation/services/preparedOrder'

const REORDER_FAILED = "We couldn't change the order. Try again."

/** An item of a prepared order: a Scenario of a Campaign or a Scene of a Scenario. */
interface OrderedItem {
  id: string
  title: string
}

/** Where focus should go once the list has caught up with a move (specs/scenario-preparation/ux.md section 2.1). */
type FocusRequest =
  | { kind: 'control'; targetId: string; expectedOrder: string }
  | { kind: 'heading'; controlId: string; staleDataUpdatedAt: number }

const orderOf = (items: readonly OrderedItem[]): string => items.map((item) => item.id).join(',')

/** Applies a focus request when the list shows what it waits for; returns whether the request is done. */
function applyFocusRequest(
  request: FocusRequest,
  items: readonly OrderedItem[],
  dataUpdatedAt: number,
  heading: HTMLElement | null,
): boolean {
  if (request.kind === 'control') {
    if (orderOf(items) !== request.expectedOrder) {
      return false
    }
    document.getElementById(request.targetId)?.focus()
    return true
  }

  if (dataUpdatedAt === request.staleDataUpdatedAt) {
    return false
  }
  if (!document.getElementById(request.controlId)) {
    heading?.focus()
  }
  return true
}

interface PreparedOrderReorderingOptions<TItem extends OrderedItem> {
  items: readonly TItem[] | undefined
  dataUpdatedAt: number
  headingRef: RefObject<HTMLElement | null>
  /** The mutation that sends the complete new id list and resolves to the items in the new order. */
  reorder: UseMutationResult<TItem[], Error, string[]>
  /** True for the error the API raises when the order is stale (409). */
  isStale: (error: Error) => boolean
  staleMessage: string
  /** `scenario` or `scene`: part of every move button id. */
  buttonIdPrefix: string
}

interface PreparedOrderReordering {
  pending: boolean
  /** The polite announcement of the last confirmed move; empty on first load. */
  announcement: string
  /** The failure message for the last move, or null. */
  alert: string | null
  move: (itemId: string, direction: MoveDirection) => void
}

/**
 * Moves an item one place per activation, sending the complete new order and showing it only once the server
 * confirms it. Owns the announcement, the failure message, and where focus goes afterwards. Shared by the Scenario and
 * Scene lists (design record PBI-SP-002, D7).
 */
export function usePreparedOrderReordering<TItem extends OrderedItem>({
  items,
  dataUpdatedAt,
  headingRef,
  reorder,
  isStale,
  staleMessage,
  buttonIdPrefix,
}: PreparedOrderReorderingOptions<TItem>): PreparedOrderReordering {
  const [announcement, setAnnouncement] = useState('')
  const [alert, setAlert] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const handledRequest = useRef<FocusRequest | null>(null)

  useEffect(() => {
    if (!focusRequest || handledRequest.current === focusRequest || !items) {
      return
    }
    if (applyFocusRequest(focusRequest, items, dataUpdatedAt, headingRef.current)) {
      handledRequest.current = focusRequest
    }
  }, [focusRequest, items, dataUpdatedAt, headingRef])

  const move = (itemId: string, direction: MoveDirection) => {
    const index = items?.findIndex((item) => item.id === itemId) ?? -1
    if (reorder.isPending || !items || index < 0) {
      return
    }

    setAnnouncement('')
    setAlert(null)
    reorder.mutate(
      moveItem(
        items.map((item) => item.id),
        index,
        direction,
      ),
      {
        onSuccess: (updated) => {
          const newIndex = updated.findIndex((item) => item.id === itemId)
          setAnnouncement(movedAnnouncement(updated[newIndex].title, newIndex + 1, updated.length))
          setFocusRequest({
            kind: 'control',
            targetId: focusTargetAfterMove(buttonIdPrefix, itemId, direction, newIndex, updated.length),
            expectedOrder: orderOf(updated),
          })
        },
        onError: (error) => {
          if (isStale(error)) {
            setAlert(staleMessage)
            setFocusRequest({
              kind: 'heading',
              controlId: moveButtonId(buttonIdPrefix, itemId, direction),
              staleDataUpdatedAt: dataUpdatedAt,
            })
            return
          }
          setAlert(REORDER_FAILED)
        },
      },
    )
  }

  return { pending: reorder.isPending, announcement, alert, move }
}
