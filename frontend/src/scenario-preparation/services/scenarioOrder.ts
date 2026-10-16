export type MoveDirection = 'up' | 'down'

/** The Scenario ids with the one at `index` moved a place; the same order when it is already first (up) or last (down). */
export function moveScenario(ids: readonly string[], index: number, direction: MoveDirection): string[] {
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= ids.length) {
    return [...ids]
  }

  const moved = [...ids]
  ;[moved[index], moved[target]] = [moved[target], moved[index]]
  return moved
}

/** The id of a Scenario's "Move up" or "Move down" button. */
export function moveScenarioButtonId(scenarioId: string, direction: MoveDirection): string {
  return `move-scenario-${direction}-${scenarioId}`
}

/** The polite announcement after a confirmed move (specs/scenario-preparation/ux.md section 6). */
export function movedAnnouncement(title: string, position: number, total: number): string {
  return `${title} moved to position ${position} of ${total}.`
}

/**
 * Where focus goes after a confirmed move: the control that was used, or the Scenario's other control when that one is
 * gone because the Scenario is now first (no "Move up") or last (no "Move down"). `newIndex` is zero-based.
 */
export function focusTargetAfterMove(scenarioId: string, direction: MoveDirection, newIndex: number, total: number): string {
  const controlIsGone = direction === 'up' ? newIndex === 0 : newIndex === total - 1
  const other: MoveDirection = direction === 'up' ? 'down' : 'up'
  return moveScenarioButtonId(scenarioId, controlIsGone ? other : direction)
}
