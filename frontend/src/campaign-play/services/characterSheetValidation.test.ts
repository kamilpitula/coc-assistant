/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { EMPTY_BACKSTORY } from '@/campaign-play/state/characterSheetForm'
import type {
  AgeBracket,
  CharacterSheetInputs,
  CharacterSheetRules,
  CharacteristicCode,
  CharacteristicInputs,
  EduImprovementCheckView,
  ValidationError,
} from '@/campaign-play/types/CharacterSheet'

import { validateCharacterSheet, type SavedRolls } from './characterSheetValidation'

// Read from disk (Vitest runs from frontend/): the shared fixtures and the age rules catalog they rely on.
interface FixtureCase {
  name: string
  scope: 'shared' | 'server'
  // The PUT body may leave out the Backstory, Key Connection, weapons, and gear (schema version 4).
  // The stored typed-in characteristic rolls ride along for the validator but are not PUT inputs.
  sheet: (Omit<CharacterSheetInputs, 'backstory' | 'keyConnection' | 'weapons' | 'gear' | 'ageEffects'> &
    Partial<CharacterSheetInputs> & {
      /** The saved deductions with the stored Player-entered EDU checks, which the PUT body no longer carries. */
      ageEffects?: { deductions?: CharacteristicInputs; eduImprovementChecks?: EduImprovementCheckView[] }
    }) & {
    characteristicRolls?: CharacteristicInputs
    /** Stored Player-entered Luck rolls, which the PUT body no longer carries. */
    luckRolls?: (number | null)[]
  }
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
    const { characteristicRolls, luckRolls, ageEffects, ...rest } = fixtureCase.sheet
    const { eduImprovementChecks, ...storedAgeEffects } = ageEffects ?? {}
    const sheet: CharacterSheetInputs = {
      backstory: EMPTY_BACKSTORY,
      keyConnection: null,
      weapons: [],
      gear: null,
      ...rest,
      ageEffects: { deductions: {}, ...storedAgeEffects },
    }
    const saved: SavedRolls = {
      characteristicRolls: characteristicRolls ?? {},
      luckRolls: luckRolls ?? [],
      eduImprovementChecks: eduImprovementChecks ?? [],
      lockedAgeBracket: null,
    }
    const actual = validateCharacterSheet(sheet, fixtures.rules, bracketFor(sheet.identity.age), saved)

    expect(sorted(actual)).toEqual(sorted(fixtureCase.expected))
  })
})

/** The saved rolls the validator reads instead of typed dice results (specs/character-sheet/ux.md section 6.8). */
describe('validateCharacterSheet with saved rolls', () => {
  const bracket25: AgeBracket = {
    minimumAge: 20,
    maximumAge: 39,
    physicalDeductionTotal: 0,
    physicalDeductionCharacteristics: [],
    appearanceModifier: 0,
    eduImprovementChecks: 1,
    luckRolls: 1,
  }

  const bracket17: AgeBracket = { ...bracket25, minimumAge: 15, maximumAge: 19, luckRolls: 2 }

  function inputs(): CharacterSheetInputs {
    return {
      identity: { name: 'Harvey Walters', age: 25, gender: null, residence: null, birthplace: null },
      creationMethod: 'PointBuy',
      characteristics: { STR: 60, CON: 60, DEX: 60, APP: 50, POW: 60, SIZ: 60, INT: 60, EDU: 50 },
      ageEffects: { deductions: {} },
      occupation: null,
      skills: [],
      quickFire: { values: [], personalInterests: [] },
      backstory: EMPTY_BACKSTORY,
      keyConnection: null,
      weapons: [],
      gear: null,
    }
  }

  function saved(overrides: Partial<SavedRolls> = {}): SavedRolls {
    return { characteristicRolls: {}, luckRolls: [], eduImprovementChecks: [], lockedAgeBracket: null, ...overrides }
  }

  function codes(errors: ValidationError[]): string[] {
    return sorted(errors).map((error) => `${error.field} ${error.code}`)
  }

  it('asks for a Luck roll and the first EDU check when nothing is rolled yet', () => {
    const errors = validateCharacterSheet(inputs(), fixtures.rules, bracket25, saved())

    expect(errors).toContainEqual(
      expect.objectContaining({ code: 'LuckRollRequired', field: 'luckRolls[0]', message: 'Roll Luck.' }),
    )
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'EduImprovementCheckRequired',
        field: 'ageEffects.eduImprovementChecks[0].check',
        message: 'Roll EDU check 1.',
      }),
    )
  })

  it('asks for only the second Luck roll in the two-roll bracket once the first is saved', () => {
    const errors = validateCharacterSheet(inputs(), fixtures.rules, bracket17, saved({ luckRolls: [11] }))

    expect(codes(errors)).toContain('luckRolls[1] LuckSecondRollRequired')
    expect(codes(errors)).not.toContain('luckRolls[0] LuckRollRequired')
  })

  it('reports an out-of-range saved Luck roll but no missing gain on a saved EDU check', () => {
    const errors = validateCharacterSheet(
      inputs(),
      fixtures.rules,
      bracket25,
      saved({ luckRolls: [30], eduImprovementChecks: [{ check: 70, gain: null, eduBefore: 50, eduAfter: 50 }] }),
    )

    expect(codes(errors)).toContain('luckRolls[0] DiceResultOutOfRange')
    expect(codes(errors).some((code) => code.includes('EduImprovementGainRequired'))).toBe(false)
  })

  it('reports an age outside the locked bracket with the bracket bounds while the lock applies (D5)', () => {
    const locked = { ...inputs(), identity: { ...inputs().identity, age: 45 } }
    const errors = validateCharacterSheet(locked, fixtures.rules, bracket25, saved({ lockedAgeBracket: bracket25 }))

    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'AgeOutOfRange',
        field: 'identity.age',
        message: 'Age must be between 20 and 39.',
      }),
    )
  })

  it('accepts an age inside the locked bracket', () => {
    const errors = validateCharacterSheet(inputs(), fixtures.rules, bracket25, saved({ lockedAgeBracket: bracket25 }))

    expect(codes(errors).some((code) => code.startsWith('identity.age'))).toBe(false)
  })
})
