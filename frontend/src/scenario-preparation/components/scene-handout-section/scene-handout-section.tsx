import { Link } from '@tanstack/react-router'
import { useEffect, useId, useRef } from 'react'

import { HandoutBadges } from '@/scenario-preparation/components/handout-badges/handout-badges'
import { MoveControls } from '@/scenario-preparation/components/move-controls/move-controls'
import { useReorderHandouts } from '@/scenario-preparation/hooks/useHandouts'
import { usePreparedOrderReordering } from '@/scenario-preparation/hooks/usePreparedOrderReordering'
import { StaleHandoutOrderError } from '@/scenario-preparation/services/handoutApi'
import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import type { SceneStatus } from '@/scenario-preparation/types/Scene'
import { Alert } from '@/shared/components/ui/alert'
import { buttonVariants } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'

interface SceneHandoutSectionProps {
  campaignId: string
  scenarioId: string
  sceneId: string
  status: SceneStatus
  /** The Scene's Handouts in stored order. */
  handouts: HandoutSummary[]
  /** When the Scene last loaded, so a stale move can tell that the refetch has landed. */
  sceneUpdatedAt: number
  /** The Handout whose link takes focus once it is listed, for example right after it was added. */
  focusHandoutId?: string
  /** Put focus on the heading when the section appears, for example right after a Handout was deleted. */
  focusHeading?: boolean
}

/**
 * The Scene's "Handouts" section (specs/scenario-preparation/ux.md section 41): each Handout in stored order as a link to its
 * page with its kind and visibility, "Add Handout" and Move up / Move down while the Scene is Prepared or Active.
 */
export function SceneHandoutSection({
  campaignId,
  scenarioId,
  sceneId,
  status,
  handouts,
  sceneUpdatedAt,
  focusHandoutId,
  focusHeading = false,
}: SceneHandoutSectionProps) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const canChange = status !== 'Finished'
  const reordering = usePreparedOrderReordering({
    items: handouts,
    dataUpdatedAt: sceneUpdatedAt,
    headingRef,
    reorder: useReorderHandouts(campaignId, scenarioId, sceneId),
    isStale: (error) => error instanceof StaleHandoutOrderError,
    staleMessage: 'The Handouts changed in another window. Check the order and try again.',
    buttonIdPrefix: 'handout',
  })

  // Focus the named Handout's link once, as soon as it is listed.
  const focused = useRef(false)
  useEffect(() => {
    if (!focusHandoutId || focused.current) {
      return
    }
    const link = sectionRef.current?.querySelector<HTMLElement>(`#${CSS.escape(handoutLinkId(focusHandoutId))}`)
    if (link) {
      focused.current = true
      link.focus()
    }
  }, [focusHandoutId, handouts])

  useEffect(() => {
    if (focusHeading) {
      headingRef.current?.focus()
    }
  }, [focusHeading])

  return (
    <section ref={sectionRef} aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          Handouts
        </h2>
        {canChange && (
          <Link
            to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/new"
            params={{ campaignId, scenarioId, sceneId }}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Add Handout
          </Link>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Player-facing Handouts reach Players only when you reveal them. Keeper-facing Handouts are never revealed.
      </p>
      <p role="status" className="sr-only">
        {reordering.announcement}
      </p>
      {reordering.alert && (
        <Alert variant="destructive" role="alert">
          {reordering.alert}
        </Alert>
      )}
      {handouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Handouts yet.</p>
      ) : (
        <Card>
          <ol className="list-decimal divide-y pr-2 pl-10">
            {handouts.map((handout, index) => (
              <li key={handout.id} className="py-1 pl-1">
                <div className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
                    <Link
                      id={handoutLinkId(handout.id)}
                      to="/campaigns/$campaignId/scenarios/$scenarioId/scenes/$sceneId/handouts/$handoutId"
                      params={{ campaignId, scenarioId, sceneId, handoutId: handout.id }}
                      className="min-h-6 text-sm font-medium break-words hover:underline"
                    >
                      {handout.title}
                    </Link>
                    <HandoutBadges kind={handout.kind} visibility={handout.visibility} />
                  </div>
                  {canChange && handouts.length > 1 && (
                    <MoveControls
                      itemId={handout.id}
                      title={handout.title}
                      isFirst={index === 0}
                      isLast={index === handouts.length - 1}
                      saving={reordering.pending}
                      buttonIdPrefix="handout"
                      onMove={reordering.move}
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </section>
  )
}

const handoutLinkId = (handoutId: string): string => `handout-link-${handoutId}`
