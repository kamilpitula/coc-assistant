/** Highest first, for display. */
function descending(values: number[]): number[] {
  return [...values].sort((first, second) => second - first)
}

/** The pool values not yet assigned (docs/game-rules sections 2.3 and 18: each value is used once). */
export function valuesLeft(pool: number[], assigned: (number | null)[]): number[] {
  const left = [...pool]
  for (const value of assigned) {
    const at = value === null ? -1 : left.indexOf(value)
    if (at >= 0) {
      left.splice(at, 1)
    }
  }
  return descending(left)
}

/** A Quick fire Select's options: the values not assigned elsewhere plus its own value (specs/character-sheet/ux.md 6.2). */
export function optionsFor(pool: number[], assignedElsewhere: (number | null)[], own: number | null): number[] {
  const available = new Set([...valuesLeft(pool, assignedElsewhere), ...(own === null ? [] : [own])])
  return descending([...available])
}
