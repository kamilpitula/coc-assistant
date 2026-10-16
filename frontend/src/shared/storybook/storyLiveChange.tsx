import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

/**
 * Story-only: applies a change to the seeded query cache a moment after mount, to show how a component absorbs a live
 * update. Render it inside StoryProviders.
 */
export function StoryLiveChange({ afterMs = 1500, apply }: { afterMs?: number; apply: (client: QueryClient) => void }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const timer = setTimeout(() => apply(queryClient), afterMs)
    return () => clearTimeout(timer)
  }, [afterMs, apply, queryClient])

  return null
}
