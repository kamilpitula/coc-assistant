import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'

/** The block shown while a Handout's image or PDF loads: a Skeleton, and no actions (SP-UX-88, SP-A11Y-48). */
export function HandoutFileLoading() {
  return (
    <div aria-busy="true">
      <Skeleton className="aspect-video w-full" />
    </div>
  )
}

interface HandoutFileFailureProps {
  message: string
  /** True while the retry runs; the button stays mounted so focus is not lost. */
  retrying: boolean
  onRetry: () => void
}

/** "We couldn't load the image." with "Try again", which refetches (ux.md sections 52 and 53). */
export function HandoutFileFailure({ message, retrying, onRetry }: HandoutFileFailureProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Alert variant="destructive" role="alert">
        {message}
      </Alert>
      <Button type="button" variant="outline" aria-disabled={retrying || undefined} onClick={() => !retrying && onRetry()}>
        Try again
      </Button>
    </div>
  )
}
