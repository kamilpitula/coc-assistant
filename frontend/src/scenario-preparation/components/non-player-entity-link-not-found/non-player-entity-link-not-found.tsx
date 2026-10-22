import { Link } from '@tanstack/react-router'

import { buttonVariants } from '@/shared/components/ui/button'

interface NonPlayerEntityLinkNotFoundProps {
  campaignId: string
  scenarioId: string
  sceneId: string
}

/** An unknown link id, or a link that has gone (specs/scenario-preparation/ux.md section 33; SP-UX-60). */
export function NonPlayerEntityLinkNotFound({ campaignId, scenarioId, sceneId }: NonPlayerEntityLinkNotFoundProps) {
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that link</h1>
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
