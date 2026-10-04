import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { navigateSpy } from '@/shared/test-support/routerMock'

import { HomeRedirect } from './home-redirect'

// specs/campaign-list/ux.md section 5, Redirect from / (CL-UX-8).

const { mockUseAuthStatus } = vi.hoisted(() => ({ mockUseAuthStatus: vi.fn() }))

vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
vi.mock('@/shared/hooks/useAuthStatus', () => ({ useAuthStatus: mockUseAuthStatus }))
vi.mock('@/shared/components/header/header', () => ({ Header: () => <div>Site header</div> }))
vi.mock('@/shared/components/hero-illustration/hero-illustration', () => ({ HeroIllustration: () => null }))

const homeHeading = { level: 1, name: 'Call of Cthulhu Campaign Assistant' }

describe('HomeRedirect', () => {
  beforeEach(() => vi.clearAllMocks())

  it('replace-redirects a signed-in Account to Campaigns without rendering the home page', () => {
    mockUseAuthStatus.mockReturnValue('signedIn')

    render(<HomeRedirect />)

    expect(navigateSpy).toHaveBeenCalledWith({ to: '/campaigns', replace: true })
    expect(screen.getByText('Site header')).toBeInTheDocument()
    expect(screen.queryByRole('heading', homeHeading)).not.toBeInTheDocument()
  })

  it('renders only the header while MSAL is resolving', () => {
    mockUseAuthStatus.mockReturnValue('resolving')

    render(<HomeRedirect />)

    expect(screen.getByText('Site header')).toBeInTheDocument()
    expect(screen.queryByRole('heading', homeHeading)).not.toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('renders the home page for a signed-out visitor', () => {
    mockUseAuthStatus.mockReturnValue('signedOut')

    render(<HomeRedirect />)

    expect(screen.getByRole('heading', homeHeading)).toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()
  })
})
