import { Link } from '@tanstack/react-router'

import { buttonVariants } from '@/shared/components/ui/button'

interface HandoutNotFoundProps {
  campaignId: string
  scenarioId: string
  sceneId: string
}

/** An unknown Handout id, or a Handout that has gone (specs/scenario-preparation/ux.md section 42; SP-UX-74). */
export function HandoutNotFound({ campaignId, scenarioId, sceneId }: HandoutNotFoundProps) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that Handout</h1>
      <Link
        to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId"
        params={{ campaignId, scenarioId, sceneId }}
        className={buttonVariants({ variant: 'link', className: 'px-0' })}
      >
        Back to the Scene
      </Link>
    </section>
  )
}
