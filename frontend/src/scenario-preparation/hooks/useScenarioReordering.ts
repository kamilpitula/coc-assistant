import { useEffect, useRef, useState, type RefObject } from 'react'

import { useReorderScenarios } from '@/scenario-preparation/hooks/useScenarios'
import { StaleScenarioOrderError } from '@/scenario-preparation/services/scenarioApi'
import {
  focusTargetAfterMove,
  movedAnnouncement,
  moveScenario,
  moveScenarioButtonId,
  type MoveDirection,
} from '@/scenario-preparation/services/scenarioOrder'
import type { Scenario } from '@/scenario-preparation/types/Scenario'

const REORDER_FAILED = "We couldn't change the order. Try again."
const REORDER_STALE = 'The Scenarios changed in another window. Check the order and try again.'

/** Where focus should go once the list has caught up with a move (specs/scenario-preparation/ux.md section 2.1). */
type FocusRequest =
  | { kind: 'control'; targetId: string; expectedOrder: string }
  | { kind: 'heading'; controlId: string; staleDataUpdatedAt: number }

const orderOf = (scenarios: readonly Scenario[]): string => scenarios.map((scenario) => scenario.id).join(',')

/** Applies a focus request when the list shows what it waits for; returns whether the request is done. */
function applyFocusRequest(
  request: FocusRequest,
  scenarios: readonly Scenario[],
  dataUpdatedAt: number,
  heading: HTMLElement | null,
): boolean {
  if (request.kind === 'control') {
    if (orderOf(scenarios) !== request.expectedOrder) {
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

interface ScenarioReordering {
  pending: boolean
  /** The polite announcement of the last confirmed move; empty on first load. */
  announcement: string
  /** The failure message for the last move, or null. */
  alert: string | null
  move: (scenarioId: string, direction: MoveDirection) => void
}

/**
 * Moves a Scenario one place per activation, sending the complete new order and showing it only once the server
 * confirms it. Owns the announcement, the failure message, and where focus goes afterwards.
 */
export function useScenarioReordering(
  campaignId: string,
  scenarios: readonly Scenario[] | undefined,
  dataUpdatedAt: number,
  headingRef: RefObject<HTMLElement | null>,
): ScenarioReordering {
  const reorder = useReorderScenarios(campaignId)
  const [announcement, setAnnouncement] = useState('')
  const [alert, setAlert] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const handledRequest = useRef<FocusRequest | null>(null)

  useEffect(() => {
    if (!focusRequest || handledRequest.current === focusRequest || !scenarios) {
      return
    }
    if (applyFocusRequest(focusRequest, scenarios, dataUpdatedAt, headingRef.current)) {
      handledRequest.current = focusRequest
    }
  }, [focusRequest, scenarios, dataUpdatedAt, headingRef])

  const move = (scenarioId: string, direction: MoveDirection) => {
    const index = scenarios?.findIndex((scenario) => scenario.id === scenarioId) ?? -1
    if (reorder.isPending || !scenarios || index < 0) {
      return
    }

    setAnnouncement('')
    setAlert(null)
    reorder.mutate(moveScenario(
      scenarios.map((scenario) => scenario.id),
      index,
      direction,
    ), {
      onSuccess: (updated) => {
        const newIndex = updated.findIndex((scenario) => scenario.id === scenarioId)
        setAnnouncement(movedAnnouncement(updated[newIndex].title, newIndex + 1, updated.length))
        setFocusRequest({
          kind: 'control',
          targetId: focusTargetAfterMove(scenarioId, direction, newIndex, updated.length),
          expectedOrder: orderOf(updated),
        })
      },
      onError: (error) => {
        if (error instanceof StaleScenarioOrderError) {
          setAlert(REORDER_STALE)
          setFocusRequest({ kind: 'heading', controlId: moveScenarioButtonId(scenarioId, direction), staleDataUpdatedAt: dataUpdatedAt })
          return
        }
        setAlert(REORDER_FAILED)
      },
    })
  }

  return { pending: reorder.isPending, announcement, alert, move }
}
