import { describe, expect, it } from 'vitest'

import { holderStatusOf, NO_HOLDER_STATUS } from './itemHolderStatus'

describe('holderStatusOf', () => {
  it('is null while no one holds the Item', () => {
    expect(holderStatusOf(null, null)).toBe(null)
  })

  it('names the holder (SPL-UX-51)', () => {
    expect(holderStatusOf({ investigatorId: 'harvey' }, 'Harvey Walters')).toBe('Held by Harvey Walters')
  })

  it('calls a missing name "Unnamed Investigator"', () => {
    expect(holderStatusOf({ investigatorId: 'harvey' }, null)).toBe('Held by Unnamed Investigator')
  })

  it('names the fallback for an Item no one holds on Keeper reference', () => {
    expect(NO_HOLDER_STATUS).toBe('Held by no one')
  })
})
