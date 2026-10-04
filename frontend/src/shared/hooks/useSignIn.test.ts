import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { apiScope } from '@/shared/services/msalConfig'

import { useSignIn } from './useSignIn'

const { mockLoginRedirect } = vi.hoisted(() => ({ mockLoginRedirect: vi.fn() }))

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: { loginRedirect: mockLoginRedirect } }),
}))

describe('useSignIn', () => {
  it('starts the MSAL login redirect for the API scope', () => {
    renderHook(() => useSignIn()).result.current()

    expect(mockLoginRedirect).toHaveBeenCalledWith({ scopes: [apiScope] })
  })
})
