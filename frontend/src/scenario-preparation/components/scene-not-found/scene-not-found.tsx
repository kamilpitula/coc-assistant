import { Link } from '@tanstack/react-router'

import { buttonVariants } from '@/shared/components/ui/button'

interface SceneNotFoundProps {
  campaignId: string
}

/** Any Scene outside the caller's visibility, or an unknown one (specs/scenario-preparation/ux.md section 14; SP-UX-26). */
export function SceneNotFound({ campaignId }: SceneNotFoundProps) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that Scene</h1>
      <Link
        to="/campaigns/$campaignId"
        params={{ campaignId }}
        className={buttonVariants({ variant: 'link', className: 'px-0' })}
      >
        Back to your Campaign
      </Link>
    </section>
  )
}
