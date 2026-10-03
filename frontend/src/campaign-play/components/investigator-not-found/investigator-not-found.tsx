import { Link } from '@tanstack/react-router'

import { buttonVariants } from '@/shared/components/ui/button'

interface InvestigatorNotFoundProps {
  campaignId: string
}

/** Any Investigator outside the caller's visibility (specs/character-sheet/ux.md section 1; UX-18). */
export function InvestigatorNotFound({ campaignId }: InvestigatorNotFoundProps) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that Investigator</h1>
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
