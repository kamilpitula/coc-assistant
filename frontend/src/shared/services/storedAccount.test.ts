import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearStoredAccount, readStoredAccount, storeAccount } from './storedAccount'

const keeperOne = { id: '1', displayName: 'Keeper One', email: 'keeper@example.com' }

describe('storedAccount', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('reads back the stored Account', () => {
    storeAccount(keeperOne)

    expect(readStoredAccount()).toEqual(keeperOne)
  })

  it('reads nothing when no Account is stored', () => {
    expect(readStoredAccount()).toBeUndefined()
  })

  it('ignores a stored value that is not valid JSON', () => {
    sessionStorage.setItem('cocassistant.account', '{not json')

    expect(readStoredAccount()).toBeUndefined()
  })

  it('ignores a stored value that is not an Account', () => {
    sessionStorage.setItem('cocassistant.account', JSON.stringify({ id: 1 }))

    expect(readStoredAccount()).toBeUndefined()
  })

  it('forgets the Account when cleared', () => {
    storeAccount(keeperOne)

    clearStoredAccount()

    expect(readStoredAccount()).toBeUndefined()
  })

  it('treats unavailable storage as empty and does not throw', () => {
    const unavailable = {
      getItem: vi.fn(() => {
        throw new Error('blocked')
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked')
      }),
      removeItem: vi.fn(() => {
        throw new Error('blocked')
      }),
    } as unknown as Storage

    expect(() => storeAccount(keeperOne, unavailable)).not.toThrow()
    expect(() => clearStoredAccount(unavailable)).not.toThrow()
    expect(readStoredAccount(unavailable)).toBeUndefined()
  })
})
