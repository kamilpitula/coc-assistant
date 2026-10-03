/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AgeBracket,
  CharacterSheetInputs,
  CharacterSheetRules,
  CharacteristicCode,
  ValidationError,
} from '@/campaign-play/types/CharacterSheet'

import { validateCharacterSheet } from './characterSheetValidation'

// Read from disk (Vitest runs from frontend/): the shared fixtures and the age rules catalog they rely on.
interface FixtureCase {
  name: string
  scope: 'shared' | 'server'
  sheet: CharacterSheetInputs
  expected: ValidationError[]
}

interface AgeRulesEntry {
  data: {
    minimumAge: number
    maximumAge: number
    keeperAdjudication: boolean
    physicalDeduction: { total: number; characteristics: CharacteristicCode[] } | null
    appearanceModifier: number | null
    eduImprovementChecks: number | null
    luckRolls: number | null
  }
}

const fixtures = JSON.parse(
  readFileSync(resolve(process.cwd(), '../specs/character-sheet/validation-fixtures.json'), 'utf-8'),
) as { rules: CharacterSheetRules; cases: FixtureCase[] }

const ageRules = JSON.parse(
  readFileSync(resolve(process.cwd(), '../docs/game-rules/catalogs/age-rules.json'), 'utf-8'),
) as { entries: AgeRulesEntry[] }

/** The bracket the API would return for the age (project_ruleset.md section 4.1 range, section 3.1 catalog). */
function bracketFor(age: number | null): AgeBracket | null {
  const { minimumAge, maximumAge } = fixtures.rules
  if (age === null || age < minimumAge || age > maximumAge) {
    return null
  }

  const entry = ageRules.entries.find(
    ({ data }) => !data.keeperAdjudication && age >= data.minimumAge && age <= data.maximumAge,
  )
  if (!entry) {
    return null
  }

  return {
    minimumAge: entry.data.minimumAge,
    maximumAge: entry.data.maximumAge,
    physicalDeductionTotal: entry.data.physicalDeduction?.total ?? 0,
    physicalDeductionCharacteristics: entry.data.physicalDeduction?.characteristics ?? [],
    appearanceModifier: entry.data.appearanceModifier ?? 0,
    eduImprovementChecks: entry.data.eduImprovementChecks ?? 0,
    luckRolls: entry.data.luckRolls ?? 1,
  }
}

function sorted(errors: ValidationError[]): ValidationError[] {
  return [...errors].sort((first, second) =>
    first.field === second.field ? first.code.localeCompare(second.code) : first.field < second.field ? -1 : 1,
  )
}

const sharedCases = fixtures.cases.filter((fixtureCase) => fixtureCase.scope === 'shared')

/**
 * specs/character-sheet/spec.md Validation: the frontend validator produces exactly the expected items for every
 * shared fixture case in specs/character-sheet/validation-fixtures.json.
 */
describe('validateCharacterSheet parity with the shared fixtures', () => {
  it('has shared cases to check', () => {
    expect(sharedCases.length).toBeGreaterThan(20)
  })

  it.each(sharedCases.map((fixtureCase) => [fixtureCase.name, fixtureCase] as const))('%s', (_name, fixtureCase) => {
    const actual = validateCharacterSheet(fixtureCase.sheet, fixtures.rules, bracketFor(fixtureCase.sheet.identity.age))

    expect(sorted(actual)).toEqual(sorted(fixtureCase.expected))
  })
})
