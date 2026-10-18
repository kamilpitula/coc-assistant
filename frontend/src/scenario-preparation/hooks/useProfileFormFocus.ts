import { useEffect, type RefObject } from 'react'

/** Moves focus to the control a change names (a new section's first field, the next row, an Add button), then clears it. */
export function useFocusTarget(focusTarget: string | null, clearFocus: () => void): void {
  useEffect(() => {
    if (focusTarget) {
      document.getElementById(focusTarget)?.focus()
      clearFocus()
    }
  }, [focusTarget, clearFocus])
}

/** Focuses the error summary each time a refused save brings new problems (SP-A11Y-20). */
export function useFocusOnce(summaryRef: RefObject<HTMLDivElement | null>, problems: unknown[]): void {
  useEffect(() => {
    if (problems.length > 0) {
      summaryRef.current?.focus()
    }
  }, [problems, summaryRef])
}
