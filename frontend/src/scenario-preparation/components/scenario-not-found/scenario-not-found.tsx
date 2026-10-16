import { Link } from '@tanstack/react-router'

import { buttonVariants } from '@/shared/components/ui/button'

interface ScenarioNotFoundProps {
  campaignId: string
}

/** Any Scenario outside the caller's visibility, or an unknown one (specs/scenario-preparation/ux.md section 5; SP-UX-9, SP-UX-10). */
export function ScenarioNotFound({ campaignId }: ScenarioNotFoundProps) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that Scenario</h1>
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
