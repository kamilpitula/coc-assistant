import {
  CHARACTERISTIC_CODES,
  type AgeBracket,
  type CharacterSheetInputs,
  type CharacterSheetRules,
  type CharacteristicCode,
  type CharacteristicInputs,
  type EduImprovementCheckInputs,
  type ValidationError,
} from '@/campaign-play/types/CharacterSheet'
import { occupationProblems, quickFireSkillProblems, skillAllocationProblems } from '@/campaign-play/services/skillValidation'
import { validationError } from '@/campaign-play/services/validationErrorFactory'

/**
 * The frontend's instant-feedback validator. It mirrors the backend for the checks with scope "shared" in the
 * ValidationError catalog of specs/character-sheet/spec.md, using the same codes, fields, and messages; the server
 * stays authoritative and alone runs the "server" checks. Rule values come only from `rules` and `bracket`.
 * Parity: specs/character-sheet/validation-fixtures.json.
 */
export function validateCharacterSheet(
  inputs: CharacterSheetInputs,
  rules: CharacterSheetRules,
  bracket: AgeBracket | null,
): ValidationError[] {
  return [
    ...identityProblems(inputs, rules),
    ...(inputs.creationMethod === null ? [error('CreationMethodRequired', 'creationMethod', 'Choose a creation method.')] : []),
    ...characteristicProblems(inputs, rules),
    ...luckProblems(inputs.luckRolls, rules, bracket),
    ...(bracket ? deductionProblems(inputs.ageEffects.deductions, bracket) : []),
    ...(bracket ? eduImprovementProblems(inputs.ageEffects.eduImprovementChecks, rules, bracket) : []),
    ...occupationProblems(inputs, rules),
    ...(inputs.creationMethod === 'QuickFire' ? quickFireSkillProblems(inputs, rules) : skillAllocationProblems(inputs.skills, rules)),
  ]
}

// docs/game-rules section 15: eight characteristics, valid under the Creation Method (sections 2.1 to 2.3).
function characteristicProblems(inputs: CharacterSheetInputs, rules: CharacterSheetRules): ValidationError[] {
  switch (inputs.creationMethod) {
    case 'StandardRolling':
      return standardRollingProblems(inputs.characteristicRolls, rules)
    case 'PointBuy':
      return [...characteristicPresenceProblems(inputs.characteristics), ...pointBuyProblems(inputs.characteristics, rules)]
    case 'QuickFire':
      return [...characteristicPresenceProblems(inputs.characteristics), ...quickFireProblems(inputs.characteristics, rules)]
    default:
      return characteristicPresenceProblems(inputs.characteristics)
  }
}

export function characteristicRollField(code: CharacteristicCode): string {
  return `characteristicRolls.${code}`
}

// docs/game-rules section 2.1: a raw total for every characteristic that its dice can produce.
function standardRollingProblems(rolls: CharacteristicInputs, rules: CharacterSheetRules): ValidationError[] {
  return CHARACTERISTIC_CODES.flatMap((code) => {
    const dice = rules.standardRolling[code].dice
    const roll = rolls[code] ?? null
    return roll === null
      ? [validationError('CharacteristicRollRequired', characteristicRollField(code), `Enter the ${dice} total for ${code}.`)]
      : diceProblems(characteristicRollField(code), diceRange(dice), roll)
  })
}

// docs/game-rules section 2.3: each pool value exactly once.
function quickFireProblems(characteristics: CharacteristicInputs, rules: CharacterSheetRules): ValidationError[] {
  const pool = rules.quickFireCharacteristicValues
  const distinct = [...new Set(pool)].sort((first, second) => first - second).join(', ')
  const present = presentEntries(characteristics)
  const notInPool = present
    .filter(([, value]) => !pool.includes(value))
    .map(([code, value]) =>
      validationError('QuickFireValueNotInPool', characteristicField(code), `${code} must be one of the Quick fire values: ${distinct}.`, distinct, String(value)),
    )

  const ascending = (values: number[]) => [...values].sort((first, second) => first - second).join(', ')
  const assigned = present.map(([, value]) => value)
  const mismatch = present.length === CHARACTERISTIC_CODES.length && notInPool.length === 0 && ascending(assigned) !== ascending(pool)
  return mismatch
    ? [
        validationError(
          'QuickFireAssignmentMismatch',
          'characteristics',
          `Use each Quick fire value exactly once: ${ascending(pool)}.`,
          ascending(pool),
          ascending(assigned),
        ),
      ]
    : notInPool
}

interface DiceRange {
  notation: string
  minimum: number
  maximum: number
}

/** The range of raw totals a dice expression such as "3D6", "D100", or "1D10" can produce. */
export function diceRange(notation: string): DiceRange {
  const [countText, sidesText] = notation.split('D')
  const count = countText === '' ? 1 : Number(countText)
  return { notation, minimum: count, maximum: count * Number(sidesText) }
}

export function characteristicField(code: CharacteristicCode): string {
  return `characteristics.${code}`
}

export function deductionField(code: CharacteristicCode): string {
  return `ageEffects.deductions.${code}`
}

export function luckRollField(index: number): string {
  return `luckRolls[${index}]`
}

export function eduCheckField(index: number): string {
  return `ageEffects.eduImprovementChecks[${index}]`
}

const error = validationError

function presentEntries(values: CharacteristicInputs): [CharacteristicCode, number][] {
  return CHARACTERISTIC_CODES.flatMap((code) => {
    const value = values[code]
    return value === null || value === undefined ? [] : [[code, value] as [CharacteristicCode, number]]
  })
}

function identityProblems(inputs: CharacterSheetInputs, rules: CharacterSheetRules): ValidationError[] {
  const { name, age } = inputs.identity
  const problems: ValidationError[] = []
  if (name === null || name.trim() === '') {
    problems.push(error('InvestigatorNameRequired', 'identity.name', "Enter your Investigator's name."))
  }

  if (age === null) {
    problems.push(error('AgeRequired', 'identity.age', "Enter your Investigator's age."))
  } else if (age < rules.minimumAge || age > rules.maximumAge) {
    problems.push(
      error(
        'AgeOutOfRange',
        'identity.age',
        `Age must be between ${rules.minimumAge} and ${rules.maximumAge}.`,
        `${rules.minimumAge}-${rules.maximumAge}`,
        String(age),
      ),
    )
  }

  return problems
}

function characteristicPresenceProblems(characteristics: CharacteristicInputs): ValidationError[] {
  return CHARACTERISTIC_CODES.filter((code) => characteristics[code] === null || characteristics[code] === undefined).map(
    (code) => error('CharacteristicRequired', characteristicField(code), `Enter a value for ${code}.`),
  )
}

// docs/game-rules section 2.2: bounds per value, the exact total, and the INT and SIZ recommendation.
function pointBuyProblems(characteristics: CharacteristicInputs, rules: CharacterSheetRules): ValidationError[] {
  const present = presentEntries(characteristics)
  const outOfRange = present
    .filter(([, value]) => value < rules.pointBuyMinimum || value > rules.pointBuyMaximum)
    .map(([code, value]) =>
      error(
        'PointBuyValueOutOfRange',
        characteristicField(code),
        `${code} must be between ${rules.pointBuyMinimum} and ${rules.pointBuyMaximum}.`,
        `${rules.pointBuyMinimum}-${rules.pointBuyMaximum}`,
        String(value),
      ),
    )

  const total = present.reduce((sum, [, value]) => sum + value, 0)
  const totalMismatch =
    present.length === CHARACTERISTIC_CODES.length && total !== rules.pointBuyBudget
      ? [
          error(
            'PointBuyTotalMismatch',
            'characteristics',
            `Your characteristics must add up to ${rules.pointBuyBudget}. They add up to ${total}.`,
            String(rules.pointBuyBudget),
            String(total),
          ),
        ]
      : []

  const belowRecommendation = present
    .filter(([code, value]) => (code === 'INT' || code === 'SIZ') && value < rules.pointBuyRecommendedMinimum)
    .map(
      ([code, value]): ValidationError => ({
        code: 'PointBuyBelowRecommendation',
        field: characteristicField(code),
        message: `${code} is below the recommended ${rules.pointBuyRecommendedMinimum}. Check with your Keeper.`,
        expected: String(rules.pointBuyRecommendedMinimum),
        actual: String(value),
        severity: 'Warning',
      }),
    )

  return [...outOfRange, ...totalMismatch, ...belowRecommendation]
}

function diceProblems(field: string, dice: DiceRange, result: number | null | undefined): ValidationError[] {
  if (result === null || result === undefined || (result >= dice.minimum && result <= dice.maximum)) {
    return []
  }

  return [
    error(
      'DiceResultOutOfRange',
      field,
      `Enter a ${dice.notation} result between ${dice.minimum} and ${dice.maximum}.`,
      `${dice.minimum}-${dice.maximum}`,
      String(result),
    ),
  ]
}

// docs/game-rules section 5.5, with the number of rolls from the age bracket.
function luckProblems(luckRolls: (number | null)[], rules: CharacterSheetRules, bracket: AgeBracket | null): ValidationError[] {
  const dice = diceRange(rules.luckDice)
  const first = luckRolls[0] ?? null
  const second = luckRolls[1] ?? null
  const firstProblems =
    first === null ? [error('LuckRollRequired', luckRollField(0), 'Enter your Luck roll.')] : diceProblems(luckRollField(0), dice, first)

  return [...firstProblems, ...secondLuckRollProblems(second, dice, bracket)]
}

function secondLuckRollProblems(second: number | null, dice: DiceRange, bracket: AgeBracket | null): ValidationError[] {
  if (bracket === null) {
    return diceProblems(luckRollField(1), dice, second)
  }

  const rollsTwice = bracket.luckRolls >= 2
  if (rollsTwice && second === null) {
    return [error('LuckSecondRollRequired', luckRollField(1), 'Enter your second Luck roll.')]
  }

  if (!rollsTwice && second !== null) {
    return [error('LuckSecondRollNotAllowed', luckRollField(1), 'Only one Luck roll is used at this age.')]
  }

  return diceProblems(luckRollField(1), dice, second)
}

// docs/game-rules section 3.1: the physical deduction comes only from the bracket's characteristics and sums to its total.
function deductionProblems(deductions: CharacteristicInputs, bracket: AgeBracket): ValidationError[] {
  const present = presentEntries(deductions)
  const perCharacteristic = present.flatMap(([code, value]) => {
    if (!bracket.physicalDeductionCharacteristics.includes(code)) {
      return [error('AgeDeductionNotAllowed', deductionField(code), `${code} can't take the age deduction at this age.`)]
    }

    return value < 0 ? [error('AgeDeductionNegative', deductionField(code), `Enter 0 or more for ${code}.`, null, String(value))] : []
  })

  const deducted = present.reduce((sum, [, value]) => sum + value, 0)
  const totalMismatch =
    deducted === bracket.physicalDeductionTotal
      ? []
      : [
          error(
            'AgeDeductionTotalMismatch',
            'ageEffects.deductions',
            `Deduct exactly ${bracket.physicalDeductionTotal} points in total. You have deducted ${deducted}.`,
            String(bracket.physicalDeductionTotal),
            String(deducted),
          ),
        ]

  return [...perCharacteristic, ...totalMismatch]
}

// docs/game-rules section 3.2: one D100 roll per required check, each gain a 1D10 result; extra checks are not needed.
function eduImprovementProblems(
  checks: EduImprovementCheckInputs[],
  rules: CharacterSheetRules,
  bracket: AgeBracket,
): ValidationError[] {
  const checkDice = diceRange(rules.eduImprovementCheckDice)
  const gainDice = diceRange(rules.eduImprovementGainDice)
  const required = Array.from({ length: bracket.eduImprovementChecks }, (_, index) =>
    requiredCheckProblems(index, checks[index], checkDice, gainDice),
  ).flat()

  const notRequired = checks
    .map((check, index) => ({ check, index }))
    .filter(({ check, index }) => index >= bracket.eduImprovementChecks && (check.check !== null || check.gain !== null))
    .map(({ index }) =>
      error('EduImprovementCheckNotRequired', eduCheckField(index), `EDU check ${index + 1} isn't needed at this age.`),
    )

  return [...required, ...notRequired]
}

function requiredCheckProblems(
  index: number,
  check: EduImprovementCheckInputs | undefined,
  checkDice: DiceRange,
  gainDice: DiceRange,
): ValidationError[] {
  if (check?.check === null || check?.check === undefined) {
    return [
      error(
        'EduImprovementCheckRequired',
        `${eduCheckField(index)}.check`,
        `Enter the ${checkDice.notation} roll for EDU check ${index + 1}.`,
      ),
    ]
  }

  const checkProblems = diceProblems(`${eduCheckField(index)}.check`, checkDice, check.check)
  return checkProblems.length > 0 ? checkProblems : diceProblems(`${eduCheckField(index)}.gain`, gainDice, check.gain)
}
