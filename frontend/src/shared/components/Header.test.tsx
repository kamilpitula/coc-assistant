import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { Header } from '@/shared/components/Header'

const { mockLoginRedirect, mockLogoutRedirect, mockUseIsAuthenticated, mockUseAccountSync } = vi.hoisted(() => ({
  mockLoginRedirect: vi.fn(),
  mockLogoutRedirect: vi.fn(),
  mockUseIsAuthenticated: vi.fn(),
  mockUseAccountSync: vi.fn(),
}))

vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: mockUseIsAuthenticated,
  useMsal: () => ({
    instance: { loginRedirect: mockLoginRedirect, logoutRedirect: mockLogoutRedirect },
  }),
}))

vi.mock('@/shared/hooks/useAccountSync', () => ({
  useAccountSync: mockUseAccountSync,
}))

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the brand text', () => {
    mockUseIsAuthenticated.mockReturnValue(false)
    mockUseAccountSync.mockReturnValue({ data: undefined })

    render(<Header />)
    expect(screen.getByText('CoC Assistant')).toBeInTheDocument()
  })

  it('renders Sign In and Sign Up buttons that trigger loginRedirect when signed out', async () => {
    mockUseIsAuthenticated.mockReturnValue(false)
    mockUseAccountSync.mockReturnValue({ data: undefined })
    const user = userEvent.setup()

    render(<Header />)

    const signIn = screen.getByRole('button', { name: /sign in/i })
    const signUp = screen.getByRole('button', { name: /sign up/i })

    expect(signIn).toBeEnabled()
    expect(signUp).toBeEnabled()

    await user.click(signIn)
    await user.click(signUp)

    expect(mockLoginRedirect).toHaveBeenCalledTimes(2)
  })

  it('renders the Account name and Sign Out when signed in', async () => {
    mockUseIsAuthenticated.mockReturnValue(true)
    mockUseAccountSync.mockReturnValue({
      data: { id: '1', displayName: 'Keeper One', email: 'keeper@example.com' },
    })
    const user = userEvent.setup()

    render(<Header />)

    expect(screen.getByText('Keeper One')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(mockLogoutRedirect).toHaveBeenCalledTimes(1)
  })
})
