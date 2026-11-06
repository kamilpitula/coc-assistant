import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface MaterialLoadStateProps {
  /** True when the Scene material query failed; the error branch takes precedence over loading. */
  isError: boolean
  /** Retries the failed Scene material query. */
  onRetry: () => void
}

/**
 * The shared loading and failure branches of the sub-tab bodies that read the Keeper Scene material
 * (specs/scene-play/ux.md section 21.10): section 12's Skeleton pair while loading, "We couldn't load this Scene's
 * material." with a retry when the read failed. Callers render this while `useScene` has no data.
 */
export function MaterialLoadState({ isError, onRetry }: MaterialLoadStateProps) {
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">We couldn&apos;t load this Scene&apos;s material.</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
