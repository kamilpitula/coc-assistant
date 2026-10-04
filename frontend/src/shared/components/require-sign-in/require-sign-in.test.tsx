import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RequireSignIn } from './require-sign-in'

// specs/campaign-list/ux.md section 4, Signed out and MSAL resolving (CL-UX-9).

const { mockUseAuthStatus } = vi.hoisted(() => ({ mockUseAuthStatus: vi.fn() }))

vi.mock('@/shared/hooks/useAuthStatus', () => ({ useAuthStatus: mockUseAuthStatus }))
vi.mock('@/shared/hooks/useSignIn', () => ({ useSignIn: () => vi.fn() }))

function renderGate() {
  return render(
    <RequireSignIn heading="Your campaigns">
      <p>Signed-in content</p>
    </RequireSignIn>,
  )
}

describe('RequireSignIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the content for a signed-in Account', () => {
    mockUseAuthStatus.mockReturnValue('signedIn')

    renderGate()

    expect(screen.getByText('Signed-in content')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument()
  })

  it('renders the sign-in prompt instead of the content for a signed-out visitor', () => {
    mockUseAuthStatus.mockReturnValue('signedOut')

    renderGate()

    expect(screen.getByRole('heading', { level: 1, name: 'Your campaigns' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('Signed-in content')).not.toBeInTheDocument()
  })

  it('renders nothing while MSAL is resolving, so neither the prompt nor the content flashes', () => {
    mockUseAuthStatus.mockReturnValue('resolving')

    const { container } = renderGate()

    expect(container).toBeEmptyDOMElement()
  })
})
