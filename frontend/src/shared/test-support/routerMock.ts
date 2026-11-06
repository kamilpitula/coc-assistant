import { createElement, type MouseEventHandler, type ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * A stand-in for the parts of @tanstack/react-router that components use, so component tests run without a router.
 * Use it with: vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
 */
export const navigateSpy = vi.fn()

export const backSpy = vi.fn()

export const routerState = {
  location: {
    search: {} as Record<string, unknown>,
    state: {} as {
      statusMessage?: string
      sidePanelOpenedHere?: boolean
      focusHeading?: boolean
      focusLinkId?: string
      focusItemLinkId?: string
      focusHandoutId?: string
      focusHandoutsHeading?: boolean
    },
  },
  matches: [] as { routeId: string }[],
}

function resolvePath(to: string, params: Record<string, string> = {}): string {
  return Object.entries(params).reduce((path, [name, value]) => path.replace(`$${name}`, value), to)
}

function resolveHref(to: string, params: Record<string, string> = {}, search: Record<string, string> = {}): string {
  const path = resolvePath(to, params)
  const query = new URLSearchParams(search).toString()
  return query === '' ? path : `${path}?${query}`
}

interface MockLinkProps {
  to: string
  params?: Record<string, string>
  search?: Record<string, string>
  state?: unknown
  children: ReactNode
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  'aria-current'?: 'page'
  'aria-label'?: string
  id?: string
}

function MockLink({ to, params, search, children, className, onClick, 'aria-current': ariaCurrent, 'aria-label': ariaLabel, id }: MockLinkProps) {
  return createElement(
    'a',
    { href: resolveHref(to, params, search), className, onClick, 'aria-current': ariaCurrent, 'aria-label': ariaLabel, id },
    children,
  )
}

export const routerMock = {
  Link: MockLink,
  Outlet: () => createElement('div', { 'data-testid': 'child-route' }),
  useNavigate: () => navigateSpy,
  useRouter: () => ({ history: { back: backSpy } }),
  useRouterState: ({ select }: { select: (state: typeof routerState) => unknown }) => select(routerState),
  useSearch: () => routerState.location.search,
}
