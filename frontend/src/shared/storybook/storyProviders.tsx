import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'

/**
 * Story-only providers: a query client seeded with the data a story needs (so no API is called) and a memory router,
 * so components that use Link and useNavigate render in isolation.
 */
export function StoryProviders({ seed, children }: { seed?: (client: QueryClient) => void; children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  seed?.(queryClient)

  const rootRoute = createRootRoute({ component: () => <>{children}</> })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ['/'] }) })

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
