import { describe, expect, it } from 'vitest'

import { optionsFor, skillValuesLeft, valuesLeft } from './quickFireValues'

const pool = [40, 50, 50, 50, 60, 60, 70, 80]

/** docs/game-rules sections 2.3 and 18: each pool value used once (specs/character-sheet/ux.md 6.2 and 6.5a). */
describe('quickFireValues', () => {
  it('lists the values left to assign, highest first', () => {
    expect(valuesLeft(pool, [50, 80, null, 45])).toEqual([70, 60, 60, 50, 50, 40])
  })

  it('offers a select the values not assigned elsewhere plus its own value, without repeats', () => {
    expect(optionsFor(pool, [50, 50, 80], 60)).toEqual([70, 60, 50, 40])
    expect(optionsFor(pool, [50, 50, 50], null)).toEqual([80, 70, 60, 40])
  })

  it('section 18: counts the skill values left, using the freed value once the extra skill takes it', () => {
    const skillPool = [70, 60, 60, 50, 50, 50, 40, 40, 40]

    expect(skillValuesLeft(skillPool, [30, 70], 40, true)).toBe(7)
    expect(skillValuesLeft(skillPool, [30, 70], 40, false)).toBe(8)
    expect(skillValuesLeft(skillPool, [50], null, false)).toBe(8)
  })
})
