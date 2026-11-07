import { createElement, useId, useState } from 'react'

import { RevealedContent } from '@/scene-play/components/revealed-content/revealed-content'
import { TakeBackItemDialog } from '@/scene-play/components/take-back-item-dialog/take-back-item-dialog'
import { useHeldItemsAnnouncement } from '@/scene-play/hooks/useHeldItemsAnnouncement'
import { useInvestigatorHeldItems, useMyHeldItems } from '@/scene-play/hooks/useHeldItems'
import { useTakeBackItemFlow } from '@/scene-play/hooks/useTakeBackItemFlow'
import type { HeldItem } from '@/scene-play/services/itemHolderApi'
import { formatClueTime, formatRevealTime, UNNAMED_INVESTIGATOR } from '@/scene-play/services/revealPresentation'
import type { PlayerReveal } from '@/scene-play/types/Reveal'
import { useHeadingTag } from '@/shared/providers/heading-offset/heading-offset-context'
import { Button } from '@/shared/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { Skeleton } from '@/shared/components/ui/skeleton'

interface HeldItemsSectionProps {
  campaignId: string
  /** The Investigator whose Items the Keeper reads; undefined for the Player's own Items. */
  investigatorId?: string
  /** The Active Scene shows the short "Given {time}"; Clues show the full "Given {date, time}". */
  shortTime?: boolean
}

/**
 * An Investigator's Items as given (specs/scene-play/ux.md section 22.7): the Player reads their own, with polite
 * announcements, and the Keeper reads any Approved Investigator's, with "Take back" on each Item. The Player variant
 * never offers "Take back" and never reads another Investigator's Items. Headings shift with the enclosing
 * `HeadingOffsetProvider`, so the Clues page keeps h2/h3 while the `clues` panel (+1) renders h3/h4.
 */
export function HeldItemsSection({ campaignId, investigatorId, shortTime }: HeldItemsSectionProps) {
  if (investigatorId === undefined) {
    return <PlayerHeldItemsSection campaignId={campaignId} shortTime={shortTime} />
  }
  return <KeeperHeldItemsSection campaignId={campaignId} investigatorId={investigatorId} shortTime={shortTime} />
}

function PlayerHeldItemsSection({ campaignId, shortTime }: { campaignId: string; shortTime?: boolean }) {
  const query = useMyHeldItems(campaignId, true)
  const headingId = useId()
  const announcement = useHeldItemsAnnouncement(query.data?.items, query.data?.investigatorName ?? null, query.isFetchedAfterMount)

  if (query.isError) {
    return <ItemsLoadError onRetry={() => void query.refetch()} />
  }
  if (query.data === undefined) {
    return <Skeleton aria-busy="true" className="h-20 w-full max-w-2xl" />
  }
  // Null is no Approved Investigator (the API answers 404): there is no one whose Items these could be.
  if (query.data === null) {
    return null
  }

  const name = query.data.investigatorName ?? UNNAMED_INVESTIGATOR

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <p role="status" className="sr-only">
        {announcement.message}
      </p>
      <SectionHeading id={headingId} name={name} />
      <ItemsBody campaignId={campaignId} name={name} items={query.data.items} shortTime={shortTime} />
    </section>
  )
}

function KeeperHeldItemsSection({
  campaignId,
  investigatorId,
  shortTime,
}: {
  campaignId: string
  investigatorId: string
  shortTime?: boolean
}) {
  const query = useInvestigatorHeldItems(campaignId, investigatorId, true)
  const headingId = useId()
  const [status, setStatus] = useState<string | null>(null)
  const flow = useTakeBackItemFlow(campaignId, { onTakenBack: setStatus, onRefetch: () => void query.refetch() })

  if (query.isError) {
    return <ItemsLoadError onRetry={() => void query.refetch()} />
  }
  if (query.data === undefined) {
    return <Skeleton aria-busy="true" className="h-20 w-full max-w-2xl" />
  }
  // Null is no such Approved Investigator (the API answers 404): the host page or panel already says so.
  if (query.data === null) {
    return null
  }

  const name = query.data.investigatorName ?? UNNAMED_INVESTIGATOR

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <SectionHeading id={headingId} name={name} />
      {status !== null && <p role="status" className="text-sm break-words">{status}</p>}
      <ItemsBody
        campaignId={campaignId}
        name={name}
        items={query.data.items}
        shortTime={shortTime}
        takeBack={(item) =>
          flow.open(
            { itemId: item.itemId, itemName: item.itemName, holderId: investigatorId, holderName: name, triggerId: item.triggerId },
            { fallbackIds: [headingId] },
          )
        }
      />
      <TakeBackItemDialog
        open={flow.request !== null}
        itemName={flow.request?.itemName ?? ''}
        holderName={flow.request?.holderName ?? name}
        pending={flow.pending}
        refusal={flow.refusal}
        onConfirm={flow.confirm}
        onCancel={flow.cancel}
        onCloseAutoFocus={flow.returnFocus}
      />
    </section>
  )
}

function SectionHeading({ id, name }: { id: string; name: string }) {
  const tag = useHeadingTag(2)

  return createElement(tag, { id, tabIndex: -1, className: 'text-lg font-semibold break-words' }, `Items ${name} holds`)
}

interface ItemsBodyProps {
  campaignId: string
  name: string
  items: Array<HeldItem & { itemId?: string }>
  shortTime?: boolean
  takeBack?: (item: { itemId: string; itemName: string; triggerId: string }) => void
}

function ItemsBody({ campaignId, name, items, shortTime, takeBack }: ItemsBodyProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{name} doesn&apos;t hold any Items.</p>
  }

  return (
    <>
      {items.map((item) => (
        <HeldItemArticle
          key={item.revealId}
          campaignId={campaignId}
          item={item}
          shortTime={shortTime}
          takeBack={takeBack && item.itemId ? { itemId: item.itemId, onTakeBack: takeBack } : undefined}
        />
      ))}
    </>
  )
}

function ItemsLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm">We couldn&apos;t load the Items.</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

interface HeldItemArticleProps {
  campaignId: string
  item: HeldItem
  shortTime?: boolean
  takeBack?: { itemId: string; onTakeBack: (item: { itemId: string; itemName: string; triggerId: string }) => void }
}

/** One held Item as it was when given (the give Reveal's snapshot), closed until "Show", with "Take back" for the Keeper. */
function HeldItemArticle({ campaignId, item, shortTime, takeBack }: HeldItemArticleProps) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const tag = useHeadingTag(3)
  const triggerId = takeBack ? `take-back-trigger-${takeBack.itemId}` : null

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <article aria-labelledby={titleId} className="flex flex-col gap-2 border-t pt-4">
        {createElement(tag, { id: titleId, className: 'text-base font-semibold break-words' }, item.name)}
        <p className="text-sm text-muted-foreground">
          Given <time dateTime={item.givenAt}>{shortTime === true ? formatRevealTime(item.givenAt) : formatClueTime(item.givenAt)}</time>
        </p>
        {takeBack && triggerId && (
          <div>
            <Button
              type="button"
              id={triggerId}
              aria-label={`Take back ${item.name}`}
              onClick={() => takeBack.onTakeBack({ itemId: takeBack.itemId, itemName: item.name, triggerId })}
            >
              Take back
            </Button>
          </div>
        )}
        <div>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" size="sm" aria-label={`${open ? 'Hide' : 'Show'} ${item.name}`}>
              {open ? 'Hide' : 'Show'}
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <RevealedContent campaignId={campaignId} reveal={revealOf(item)} />
        </CollapsibleContent>
      </article>
    </Collapsible>
  )
}

/** A held Item as the PlayerReveal its give Reveal carries, so `RevealedContent` renders the snapshot like an Item Reveal. */
function revealOf(item: HeldItem): PlayerReveal {
  return {
    revealId: item.revealId,
    revealedAt: item.givenAt,
    subjectType: 'Item',
    title: item.name,
    handoutKind: null,
    content: item.description,
    file: null,
    imageDescription: null,
  }
}
