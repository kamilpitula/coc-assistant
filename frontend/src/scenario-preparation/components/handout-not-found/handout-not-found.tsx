import { Link } from '@tanstack/react-router'

import { describeHandoutOwner, type HandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { buttonVariants } from '@/shared/components/ui/button'

interface HandoutNotFoundProps {
  owner: HandoutOwner
  /** The label of the link back to the owner's page, for example "Back to the Scene". */
  backLabel: string
}

/** An unknown Handout id, or a Handout that has gone (specs/scenario-preparation/ux.md sections 42 and 65; SP-UX-74). */
export function HandoutNotFound({ owner, backLabel }: HandoutNotFoundProps) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that Handout</h1>
      <Link {...describeHandoutOwner(owner).ownerPage} className={buttonVariants({ variant: 'link', className: 'px-0' })}>
        {backLabel}
      </Link>
    </section>
  )
}
