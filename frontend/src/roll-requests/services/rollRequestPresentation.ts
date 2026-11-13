import { skillDisplayName } from '@/campaign-play/services/skillValidation'
import type { PercentileOutcome, RollRequest, RollRequestTarget } from '@/roll-requests/types/RollRequest'

/** The dice line of a row (specs/roll-requests/ux.md section 11). */
export function describeDice(bonusDice: number, penaltyDice: number): string {
  const parts: string[] = []
  if (bonusDice > 0) {
    parts.push(`${bonusDice} Bonus ${bonusDice === 1 ? 'Die' : 'Dice'}`)
  }
  if (penaltyDice > 0) {
    parts.push(`${penaltyDice} Penalty ${penaltyDice === 1 ? 'Die' : 'Dice'}`)
  }

  return parts.length > 0 ? parts.join(', ') : 'no Bonus or Penalty Dice'
}

/** The outcome copy from the Success Level and the Difficulty (specs/roll-requests/ux.md section 5; skill rolls section 4.3). */
export function describeOutcome(successLevel: PercentileOutcome['successLevel'], isSuccess: boolean, difficulty: string): string {
  if (!isSuccess) {
    return successLevel === 'Failure' || successLevel === 'Fumble' ? successLevel : `${successLevel} - not enough for ${difficulty}`
  }

  return `${successLevel} success`
}

/** The faces line of a rolled percentile roll (skill rolls section 5); tens print as two digits. */
export function describeFaces(percentile: Pick<PercentileOutcome, 'unitsFace' | 'tensFaces' | 'result'>): string {
  const tens = percentile.tensFaces.map((face) => String(face).padStart(2, '0'))
  if (tens.length === 1) {
    return `Tens ${tens[0]}, units ${percentile.unitsFace} = ${percentile.result}`
  }

  const allButLast = tens.slice(0, -1).join(', ')
  return `Tens ${allButLast} and ${tens[tens.length - 1]}, units ${percentile.unitsFace} - kept ${percentile.result}`
}

/** The three target values from the snapshot Regular value (skill rolls section 2). */
export function describeTargets(targetValue: number): string {
  return `${targetValue} / ${Math.floor(targetValue / 2)} / ${Math.floor(targetValue / 5)}`
}

/** The target's display name: "Spot Hidden", "Language (Latin)", "DEX", or "Luck". */
export function rollTargetName(target: RollRequestTarget): string {
  if (target.kind === 'Characteristic') {
    return target.characteristic ?? ''
  }

  if (target.kind === 'Luck') {
    return 'Luck'
  }

  return skillDisplayName(target.skill ?? '', target.specialization)
}

/** "Harvey Walters", "Harvey Walters and Lucy Ward", "Harvey Walters, Lucy Ward and Cy Holloway". */
export function joinInvestigatorNames(names: string[]): string {
  if (names.length <= 2) {
    return names.join(' and ')
  }

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/**
 * The hidden-roll status line from the 201 response (specs/roll-requests/ux.md section 3.1, RR-UX-18): "{target}
 * hidden roll: {name} rolled {result}: {outcome}; ...". Investigators appear in the request's row order, and an
 * unnamed Investigator is "Unnamed Investigator".
 */
export function hiddenRollStatus(request: RollRequest): string {
  const parts = request.requestedRolls.map((roll) => {
    const record = roll.rolls[0]
    const result = record?.result
    const outcome =
      record?.percentile === null || record?.percentile === undefined
        ? `${result}`
        : `${result}: ${describeOutcome(record.percentile.successLevel, record.percentile.isSuccess, roll.difficulty)}`
    return `${roll.investigatorName ?? 'Unnamed Investigator'} rolled ${outcome}`
  })

  return `${rollTargetName(request.target)} hidden roll: ${parts.join('; ')}.`
}
