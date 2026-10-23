import { Link } from '@tanstack/react-router'

import { buttonVariants } from '@/shared/components/ui/button'

interface ItemNotFoundProps {
  campaignId: string
}

/** Any Item outside the caller's visibility, or an unknown one (specs/scenario-preparation/ux.md section 63.1; SP-UX-102). */
export function ItemNotFound({ campaignId }: ItemNotFoundProps) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that Item</h1>
      <Link to="/campaigns/$campaignId" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'px-0' })}>
        Back to your Campaign
      </Link>
    </section>
  )
}
