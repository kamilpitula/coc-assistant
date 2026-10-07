import { CircleAlert } from 'lucide-react'

interface PointsLeftCounterProps {
  /** "Occupation points" or "Personal interest points". */
  label: string
  /** The budget the server computed (docs/game-rules sections 7.1 and 8), or null while it is unknown. */
  budget: number | null
  spent: number
}

/** "Occupation points left: 120 of 280", or "40 over budget" with an icon (specs/character-sheet/ux.md 6.5, 6.6; A11Y-6). */
export function PointsLeftCounter({ label, budget, spent }: PointsLeftCounterProps) {
  if (budget === null) {
    return null
  }

  const left = budget - spent
  return left < 0 ? (
    <p className="flex items-center gap-1 text-sm font-medium text-destructive">
      <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
      {-left} over budget
    </p>
  ) : (
    <p className="text-sm font-medium">
      {label} left: {left} of {budget}
    </p>
  )
}
