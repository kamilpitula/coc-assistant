import { Link } from '@tanstack/react-router'

import { buttonVariants } from '@/shared/components/ui/button'

interface NonPlayerEntityNotFoundProps {
  campaignId: string
}

/** Any Non-Player Entity outside the caller's visibility, or an unknown one (specs/scenario-preparation/ux.md section 25.6; SP-UX-39). */
export function NonPlayerEntityNotFound({ campaignId }: NonPlayerEntityNotFoundProps) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that Non-Player Entity</h1>
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
