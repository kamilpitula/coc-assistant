import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Header, slowResolvingDelayMs } from './header'

const { mockLoginRedirect, mockLogoutRedirect, mockUseIsAuthenticated, mockUseAccountSync, mockClearStoredAccount, msalState } =
  vi.hoisted(() => ({
    mockLoginRedirect: vi.fn(),
    mockLogoutRedirect: vi.fn(),
    mockUseIsAuthenticated: vi.fn(),
    mockUseAccountSync: vi.fn(),
    mockClearStoredAccount: vi.fn(),
    msalState: { inProgress: 'none' },
  }))

vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: mockUseIsAuthenticated,
  useMsal: () => ({
    instance: { loginRedirect: mockLoginRedirect, logoutRedirect: mockLogoutRedirect },
    inProgress: msalState.inProgress,
  }),
}))

vi.mock('@/shared/hooks/useAccountSync', () => ({
  useAccountSync: mockUseAccountSync,
}))

vi.mock('@/shared/services/storedAccount', () => ({
  clearStoredAccount: mockClearStoredAccount,
}))

const keeperOne = { id: '1', displayName: 'Keeper One', email: 'keeper@example.com' }

function signedOut() {
  msalState.inProgress = 'none'
  mockUseIsAuthenticated.mockReturnValue(false)
  mockUseAccountSync.mockReturnValue({ data: undefined, isError: false })
}

function signedIn(account: typeof keeperOne | undefined) {
  msalState.inProgress = 'none'
  mockUseIsAuthenticated.mockReturnValue(true)
  mockUseAccountSync.mockReturnValue({ data: account, isError: false })
}

function resolving() {
  msalState.inProgress = 'startup'
  mockUseIsAuthenticated.mockReturnValue(false)
  mockUseAccountSync.mockReturnValue({ data: undefined, isError: false })
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the brand text', () => {
    signedOut()
    render(<Header />)
    expect(screen.getByText('CoC Assistant')).toBeInTheDocument()
  })

  it('renders Sign In and Sign Up buttons that trigger loginRedirect when signed out', async () => {
    signedOut()
    const user = userEvent.setup()
    render(<Header />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(mockLoginRedirect).toHaveBeenCalledTimes(2)
  })

  it('renders the Account name and Sign Out when signed in', () => {
    signedIn(keeperOne)
    render(<Header />)

    expect(screen.getByText('Keeper One')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument()
  })

  it('forgets the stored Account before redirecting on Sign Out (UX-AUTH-6)', async () => {
    signedIn(keeperOne)
    const user = userEvent.setup()
    render(<Header />)

    await user.click(screen.getByRole('button', { name: /sign out/i }))

    expect(mockClearStoredAccount).toHaveBeenCalledTimes(1)
    expect(mockLogoutRedirect).toHaveBeenCalledTimes(1)
    expect(mockClearStoredAccount.mock.invocationCallOrder[0]).toBeLessThan(mockLogoutRedirect.mock.invocationCallOrder[0])
  })

  it('links to the Campaigns page when signed in', () => {
    signedIn(keeperOne)
    render(<Header />)
    expect(screen.getByRole('link', { name: /campaigns/i })).toHaveAttribute('href', '/campaigns')
  })

  it('does not link to the Campaigns page when signed out', () => {
    signedOut()
    render(<Header />)
    expect(screen.queryByRole('link', { name: /campaigns/i })).not.toBeInTheDocument()
  })

  it('shows Campaigns and Sign Out while the Account name is loading (UX-AUTH-4)', () => {
    signedIn(undefined)
    render(<Header />)

    expect(screen.getByRole('link', { name: /campaigns/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    expect(screen.getByTestId('account-name-skeleton')).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows no name text for an Account with an empty display name (UX-AUTH-5)', () => {
    signedIn({ ...keeperOne, displayName: '' })
    render(<Header />)

    expect(screen.getByRole('link', { name: /campaigns/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    expect(screen.queryByTestId('account-name-skeleton')).not.toBeInTheDocument()
    expect(screen.queryByText('Keeper One')).not.toBeInTheDocument()
  })

  it('shows Account unavailable and Sign Out when the Account sync fails', () => {
    msalState.inProgress = 'none'
    mockUseIsAuthenticated.mockReturnValue(true)
    mockUseAccountSync.mockReturnValue({ data: undefined, isError: true })
    render(<Header />)

    expect(screen.getByRole('status')).toHaveTextContent('Account unavailable')
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('renders no sign-in actions and no skeleton while MSAL starts up (UX-AUTH-1, UX-AUTH-A11Y-1)', () => {
    resolving()
    const { container } = render(<Header />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('auth-skeleton')).not.toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('shows the skeleton only once MSAL has been starting up for longer than the delay (UX-AUTH-2)', () => {
    vi.useFakeTimers()
    resolving()
    render(<Header />)

    act(() => vi.advanceTimersByTime(slowResolvingDelayMs - 1))
    expect(screen.queryByTestId('auth-skeleton')).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    const skeletons = screen.getAllByTestId('auth-skeleton')
    expect(skeletons).toHaveLength(2)
    skeletons.forEach((skeleton) => expect(skeleton).toHaveAttribute('aria-hidden', 'true'))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
