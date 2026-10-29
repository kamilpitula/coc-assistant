import { Link } from '@tanstack/react-router'
import type { Ref } from 'react'

import { buttonVariants } from '@/shared/components/ui/button'

interface NoActiveSceneProps {
  campaignId: string
  isKeeper: boolean
  headingRef?: Ref<HTMLHeadingElement>
}

/** What both roles see while no Scene is Active (specs/scene-play/ux.md section 4.3). */
export function NoActiveScene({ campaignId, isKeeper, headingRef }: NoActiveSceneProps) {
  return (
    <section className="flex max-w-2xl flex-col items-start gap-3">
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold outline-none">
        No Active Scene
      </h1>
      <p className="text-sm">No Scene is being played right now.</p>
      {isKeeper && <p className="text-sm text-muted-foreground">Start a Scene from its page in a Scenario.</p>}
      <Link to="/campaigns/$campaignId" params={{ campaignId }} className={buttonVariants({ variant: 'link', className: 'px-0' })}>
        Back to your Campaign
      </Link>
    </section>
  )
}
