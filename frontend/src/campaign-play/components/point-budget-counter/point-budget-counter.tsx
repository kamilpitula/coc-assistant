import type { CharacteristicInputs } from '@/campaign-play/types/CharacterSheet'

interface PointBuyBudgetCounterProps {
  values: CharacteristicInputs
  /** The Point Buy budget from the rules data. */
  budget: number
}

/** "Points used: 410 of 460" for the Point buy characteristics (specs/character-sheet/ux.md section 6.2). */
export function PointBuyBudgetCounter({ values, budget }: PointBuyBudgetCounterProps) {
  const used = Object.values(values).reduce<number>((sum, value) => sum + (value ?? 0), 0)
  return (
    <p className="text-sm font-medium">
      Points used: {used} of {budget}
    </p>
  )
}
