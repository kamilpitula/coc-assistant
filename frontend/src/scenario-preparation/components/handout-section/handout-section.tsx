import { Link } from '@tanstack/react-router'
import { useEffect, useId, useRef } from 'react'

import { MoveControls } from '@/scenario-preparation/components/move-controls/move-controls'
import { MaterialEntry, MaterialEntryList } from '@/scenario-preparation/components/material-entry/material-entry'
import { useReorderHandouts } from '@/scenario-preparation/hooks/useHandouts'
import { usePreparedOrderReordering } from '@/scenario-preparation/hooks/usePreparedOrderReordering'
import { StaleHandoutOrderError } from '@/scenario-preparation/services/handoutApi'
import { describeHandoutOwner, type HandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import type { HandoutSummary } from '@/scenario-preparation/types/Handout'
import { Alert } from '@/shared/components/ui/alert'
import { buttonVariants } from '@/shared/components/ui/button'

interface HandoutSectionProps {
  /** The Scene or Item whose Handouts these are. */
  owner: HandoutOwner
  /** "Add Handout" and the move buttons are offered; false once the owner can not be changed. */
  canChange: boolean
  /** The owner's Handouts in stored order. */
  handouts: HandoutSummary[]
  /** When the owner last loaded, so a stale move can tell that the refetch has landed. */
  ownerUpdatedAt: number
  /** The Handout whose link takes focus once it is listed, for example right after it was added. */
  focusHandoutId?: string
  /** Put focus on the heading when the section appears, for example right after a Handout was deleted. */
  focusHeading?: boolean
}

/**
 * The "Handouts" section of a Scene or an Item (specs/scenario-preparation/ux.md sections 41 and 65): each Handout in
 * stored order as a material entry with its kind and visibility, "Add Handout" and Move up / Move down while the owner
 * can be changed. On a Scene the title opens the Handout panel; on an Item it links to the Handout page (PBI-SPL-005
 * design record D3).
 */
export function HandoutSection({
  owner,
  canChange,
  handouts,
  ownerUpdatedAt,
  focusHandoutId,
  focusHeading = false,
}: HandoutSectionProps) {
  const pages = describeHandoutOwner(owner)
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const reordering = usePreparedOrderReordering({
    items: handouts,
    dataUpdatedAt: ownerUpdatedAt,
    headingRef,
    reorder: useReorderHandouts(owner),
    isStale: (error) => error instanceof StaleHandoutOrderError,
    staleMessage: 'The Handouts changed in another window. Check the order and try again.',
    buttonIdPrefix: 'handout',
  })

  // Focus the named Handout's title once, as soon as it is listed.
  const focused = useRef(false)
  useEffect(() => {
    if (!focusHandoutId || focused.current) {
      return
    }
    const title = sectionRef.current?.querySelector<HTMLElement>(`#${CSS.escape(handoutLinkId(focusHandoutId))}`)
    if (title) {
      focused.current = true
      title.focus()
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
          <Link {...pages.addHandoutPage} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
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
        <MaterialEntryList as="ol">
          {handouts.map((handout, index) => (
            <MaterialEntry
              key={handout.id}
              subject={{
                type: 'handout',
                handout,
                page: owner.type === 'item' ? describeHandoutOwner(owner).handoutPage(handout.id) : undefined,
              }}
              titleId={handoutLinkId(handout.id)}
              action={
                canChange && handouts.length > 1 ? (
                  <MoveControls
                    itemId={handout.id}
                    title={handout.title}
                    isFirst={index === 0}
                    isLast={index === handouts.length - 1}
                    saving={reordering.pending}
                    buttonIdPrefix="handout"
                    onMove={reordering.move}
                  />
                ) : undefined
              }
            />
          ))}
        </MaterialEntryList>
      )}
    </section>
  )
}

const handoutLinkId = (handoutId: string): string => `handout-link-${handoutId}`
