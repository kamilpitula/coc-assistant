import { createElement, type MouseEventHandler, type ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * A stand-in for the parts of @tanstack/react-router that components use, so component tests run without a router.
 * Use it with: vi.mock('@tanstack/react-router', async () => (await import('@/shared/test-support/routerMock')).routerMock)
 */
export const navigateSpy = vi.fn()

export const routerState = { location: { state: {} as { statusMessage?: string } } }

function resolvePath(to: string, params: Record<string, string> = {}): string {
  return Object.entries(params).reduce((path, [name, value]) => path.replace(`$${name}`, value), to)
}

interface MockLinkProps {
  to: string
  params?: Record<string, string>
  children: ReactNode
  className?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  'aria-current'?: 'page'
}

function MockLink({ to, params, children, className, onClick, 'aria-current': ariaCurrent }: MockLinkProps) {
  return createElement('a', { href: resolvePath(to, params), className, onClick, 'aria-current': ariaCurrent }, children)
}

export const routerMock = {
  Link: MockLink,
  useNavigate: () => navigateSpy,
  useRouterState: ({ select }: { select: (state: typeof routerState) => unknown }) => select(routerState),
}
