import { validationError, validationWarning } from '@/campaign-play/services/validationErrorFactory'
import type {
  CharacterSheetInputs,
  CharacterSheetRules,
  CustomOccupationInputs,
  SkillAllocationInputs,
  ValidationError,
} from '@/campaign-play/types/CharacterSheet'

/**
 * The shared (client-side) Occupation, skill, and Quick fire checks of the ValidationError catalog in
 * specs/character-sheet/spec.md. Checks that need the Occupation or skill catalogs or the budgets run only on the
 * server. Rule values come only from `rules`.
 */
export function occupationProblems(inputs: CharacterSheetInputs, rules: CharacterSheetRules): ValidationError[] {
  const occupation = inputs.occupation
  if (occupation === null || (occupation.catalogId === null && occupation.custom === null)) {
    return [validationError('OccupationRequired', 'occupation', 'Choose an occupation.')]
  }

  return occupation.catalogId === null && occupation.custom !== null ? customOccupationProblems(occupation.custom, rules) : []
}

// docs/game-rules section 7 and 7.3: a name, a listed formula, every occupation skill, and a valid Credit Rating range.
function customOccupationProblems(custom: CustomOccupationInputs, rules: CharacterSheetRules): ValidationError[] {
  const problems: ValidationError[] = []
  if (custom.name === null || custom.name.trim() === '') {
    problems.push(validationError('CustomOccupationNameRequired', 'occupation.custom.name', 'Enter a name for your occupation.'))
  }

  if (!rules.occupationPointFormulas.some((formula) => formula.id === custom.formulaId)) {
    problems.push(
      validationError('CustomOccupationFormulaNotAllowed', 'occupation.custom.formulaId', 'Choose a point formula from the list.', null, custom.formulaId),
    )
  }

  if (!isValidCreditRatingRange(custom.creditRatingMin, custom.creditRatingMax, rules)) {
    problems.push(
      validationError(
        'CustomOccupationCreditRatingRangeInvalid',
        'occupation.custom.creditRating',
        `Enter a Credit Rating range between ${rules.creditRatingMinimum} and ${rules.creditRatingMaximum}, with the minimum no higher than the maximum.`,
        `${rules.creditRatingMinimum}-${rules.creditRatingMaximum}`,
        `${custom.creditRatingMin ?? ''}-${custom.creditRatingMax ?? ''}`,
      ),
    )
  }

  const missingSkills = Array.from({ length: rules.customOccupationSkillCount }, (_, index) => index)
    .filter((index) => (custom.skills[index] ?? null) === null)
    .map((index) =>
      validationError('CustomOccupationSkillRequired', `occupation.custom.skills[${index}]`, `Choose occupation skill ${index + 1}.`),
    )

  return [...problems, ...missingSkills]
}

function isValidCreditRatingRange(minimum: number | null, maximum: number | null, rules: CharacterSheetRules): boolean {
  const inRange = (value: number) => value >= rules.creditRatingMinimum && value <= rules.creditRatingMaximum
  return minimum !== null && maximum !== null && inRange(minimum) && inRange(maximum) && minimum <= maximum
}

/** The display name of a skill: "Skill (Specialization)", or "Skill: Specialization" after a parenthesis. */
export function skillDisplayName(skill: string, specialization: string | null): string {
  if (specialization === null) {
    return skill
  }

  return skill.endsWith(')') ? `${skill}: ${specialization}` : `${skill} (${specialization})`
}

function sameSkill(first: string, second: string): boolean {
  return first.localeCompare(second, undefined, { sensitivity: 'accent' }) === 0
}

// docs/game-rules sections 7.2 and 8; project_ruleset.md sections 3 and 4.6.
export function skillAllocationProblems(skills: SkillAllocationInputs[], rules: CharacterSheetRules): ValidationError[] {
  return skills.flatMap((allocation, index) => [
    ...pointProblems(allocation, `skills[${index}].occupationPoints`, allocation.occupationPoints, rules),
    ...pointProblems(allocation, `skills[${index}].personalInterestPoints`, allocation.personalInterestPoints, rules),
    ...(sameSkill(allocation.skill, rules.creditRatingSkill) && (allocation.personalInterestPoints ?? 0) > 0
      ? [
          validationError(
            'PersonalInterestPointsOnCreditRating',
            `skills[${index}].personalInterestPoints`,
            'Credit Rating can only take occupation points.',
            null,
            String(allocation.personalInterestPoints),
          ),
        ]
      : []),
  ])
}

function pointProblems(allocation: SkillAllocationInputs, field: string, points: number | null, rules: CharacterSheetRules): ValidationError[] {
  if (points !== null && points < 0) {
    const name = skillDisplayName(allocation.skill, allocation.specialization)
    return [validationError('SkillPointsNegative', field, `Enter 0 or more points for ${name}.`, null, String(points))]
  }

  if (points !== null && points > 0 && sameSkill(allocation.skill, rules.cthulhuMythosSkill)) {
    return [validationError('CreationPointsOnCthulhuMythos', field, "Cthulhu Mythos can't take points at creation.", null, String(points))]
  }

  return []
}

// docs/game-rules section 18: values from the skill pool (Credit Rating has its own rule), and the number of interests.
export function quickFireSkillProblems(inputs: CharacterSheetInputs, rules: CharacterSheetRules): ValidationError[] {
  const pool = [...new Set(rules.quickFireSkillValues)].join(', ')
  const notInPool = inputs.quickFire.values.flatMap((entry, index) =>
    entry.value !== null && !sameSkill(entry.skill, rules.creditRatingSkill) && !rules.quickFireSkillValues.includes(entry.value)
      ? [
          validationError(
            'QuickFireSkillValueNotInPool',
            `quickFire.values[${index}].value`,
            `Use one of the Quick fire skill values: ${pool}.`,
            pool,
            String(entry.value),
          ),
        ]
      : [],
  )

  return [...notInPool, ...personalInterestCountProblems(inputs.quickFire.personalInterests.length, rules)]
}

function personalInterestCountProblems(chosen: number, rules: CharacterSheetRules): ValidationError[] {
  const count = rules.quickFirePersonalInterestCount
  const message = `Choose ${count} personal interest skills. You have chosen ${chosen}.`
  if (chosen > count) {
    return [validationError('QuickFirePersonalInterestsTooMany', 'quickFire.personalInterests', message, String(count), String(chosen))]
  }

  return chosen < count
    ? [validationWarning('QuickFirePersonalInterestsUnchosen', 'quickFire.personalInterests', message, String(count), String(chosen))]
    : []
}
