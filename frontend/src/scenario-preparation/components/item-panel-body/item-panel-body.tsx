import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { useApprovedInvestigatorNames } from '@/campaign-play/hooks/useApprovedInvestigatorNames'
import { UNNAMED_INVESTIGATOR } from '@/campaign-play/services/rosterRows'
import { HandoutBadges } from '@/scenario-preparation/components/handout-badges/handout-badges'
import { useItem } from '@/scenario-preparation/hooks/useItems'
import { holderStatusOf, NO_HOLDER_STATUS } from '@/scenario-preparation/services/itemHolderStatus'
import type { Item } from '@/scenario-preparation/types/Item'
import type { Origin } from '@/shared/components/back-link/backLinkOrigin'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'
import { RichTextView } from '@/shared/components/rich-text-view/rich-text-view'
import { buttonVariants } from '@/shared/components/ui/button'
import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'
import { isEmptyRichText } from '@/shared/services/richText'

interface ItemPanelBodyProps {
  campaignId: string
  itemId: string
  /** Where the viewer came from; the "Open full page" link carries it, and the Item page shows its origin back link. */
  from?: Origin
  /** One context action in the footer, shown only when ready; the Active Scene passes its "Reveal..." trigger. */
  action?: ReactNode
  /** A status line under the title, shown only when ready; the Active Scene passes the reveal status. */
  statusLine?: string | null
}

/**
 * An Item in a side panel body (specs/navigation/ux.md section 3, specs/scene-play/ux.md 22.5): what Players see,
 * then the holder, the Handouts, and the Keeper notes, one level up from the page so content headings start at h4. The
 * host passes the Item's id and, when it has an origin, `from`; the body loads through the same query as the Item page
 * and resolves the holder name from the Approved Investigators.
 */
export function ItemPanelBody({ campaignId, itemId, from, action, statusLine }: ItemPanelBodyProps) {
  const item = useItem(campaignId, itemId, true)
  const holderNames = useApprovedInvestigatorNames(campaignId)

  if (item.data === null) {
    return <SidePanelContent kindLabel="Item" title={null} state="not-found" />
  }
  if (item.isError || holderNames.isError) {
    return (
      <SidePanelContent
        kindLabel="Item"
        title={null}
        state="error"
        onRetry={() => {
          void item.refetch()
          holderNames.refetch()
        }}
      />
    )
  }
  if (item.data === undefined || holderNames.names === undefined) {
    return <SidePanelContent kindLabel="Item" title={null} state="loading" />
  }

  return (
    <SidePanelContent
      kindLabel="Item"
      title={item.data.name}
      state="ready"
      action={action}
      footer={<ItemPanelFooter campaignId={campaignId} itemId={itemId} from={from} />}
    >
      {statusLine === null || statusLine === undefined ? null : <p className="text-sm break-words text-muted-foreground">{statusLine}</p>}
      <section aria-labelledby={`${itemId}-players`} className="flex flex-col gap-2">
        <h3 id={`${itemId}-players`} className="text-lg font-semibold">
          What Players see
        </h3>
        <HeadingOffsetProvider value={1}>
          <RichTextView document={item.data.playerFacingDescription} headingOffset={0} />
        </HeadingOffsetProvider>
      </section>
      <p className="text-sm text-muted-foreground">{holderLineOf(item.data, holderNames.names)}</p>
      <ItemHandouts itemId={itemId} handouts={item.data.handouts} />
      <ItemKeeperNotes itemId={itemId} keeperNotes={item.data.keeperNotes} />
    </SidePanelContent>
  )
}

/** The holder line, with the name resolved from the Approved Investigators (22.6). */
function holderLineOf(item: Item, names: Map<string, string>): string {
  const holderName = item.holder === null ? null : (names.get(item.holder.investigatorId) ?? UNNAMED_INVESTIGATOR)
  return `${holderStatusOf(item.holder, holderName) ?? NO_HOLDER_STATUS}.`
}

/** The "Open full page" footer, carrying the origin so the Item page links back. */
function ItemPanelFooter({ campaignId, itemId, from }: { campaignId: string; itemId: string; from?: Origin }) {
  return (
    <Link
      to="/campaigns/$campaignId/items/$itemId"
      params={{ campaignId, itemId }}
      {...(from === undefined ? {} : { search: { from } })}
      className={buttonVariants({ variant: 'link', className: 'px-0' })}
    >
      Open full page
      <ArrowRight aria-hidden="true" />
    </Link>
  )
}

/** The Item's Handouts with their kind and visibility badges. */
function ItemHandouts({ itemId, handouts }: { itemId: string; handouts: Item['handouts'] }) {
  return (
    <section aria-labelledby={`${itemId}-handouts`} className="flex flex-col gap-2">
      <h3 id={`${itemId}-handouts`} className="text-lg font-semibold">
        Handouts
      </h3>
      {handouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No Handouts.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {handouts.map((handout) => (
            <li key={handout.id} className="flex flex-col gap-1">
              <span className="text-sm font-medium break-words">{handout.title}</span>
              <HandoutBadges kind={handout.kind} visibility={handout.visibility} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** The Keeper notes, or the empty text when there are none. */
function ItemKeeperNotes({ itemId, keeperNotes }: { itemId: string; keeperNotes: Item['keeperNotes'] }) {
  return (
    <section aria-labelledby={`${itemId}-notes`} className="flex flex-col gap-2">
      <h3 id={`${itemId}-notes`} className="text-lg font-semibold">
        Keeper notes
      </h3>
      {keeperNotes !== null && !isEmptyRichText(keeperNotes) ? (
        <HeadingOffsetProvider value={1}>
          <RichTextView document={keeperNotes} headingOffset={0} />
        </HeadingOffsetProvider>
      ) : (
        <p className="text-sm text-muted-foreground">No Keeper notes yet.</p>
      )}
    </section>
  )
}
