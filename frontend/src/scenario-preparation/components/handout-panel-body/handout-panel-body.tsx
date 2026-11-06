import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { HandoutBadges } from '@/scenario-preparation/components/handout-badges/handout-badges'
import { HandoutPreview } from '@/scenario-preparation/components/handout-preview/handout-preview'
import { useHandout } from '@/scenario-preparation/hooks/useHandouts'
import { describeHandoutOwner, type SceneHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'
import type { Origin } from '@/shared/components/back-link/backLinkOrigin'
import { buttonVariants } from '@/shared/components/ui/button'
import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'

interface HandoutPanelBodyProps {
  owner: SceneHandoutOwner
  handoutId: string
  /** Where the viewer came from; the "Open full page" link carries it, and the full page shows its origin back link. */
  from?: Origin
  /** One context action in the footer, shown only when ready; the Active Scene passes its "Reveal..." trigger. */
  action?: ReactNode
  /** A status line under the title, shown only when ready; the Active Scene passes the reveal status. */
  statusLine?: string | null
}

/**
 * A Scene's Handout in a side panel body (specs/navigation/ux.md section 3): its badges and current content, one level
 * up from the page so content headings start at h3. The host passes the Scene's ids and, when it has an origin, `from`;
 * the body loads and authorizes through the same query as the Handout page.
 */
export function HandoutPanelBody({ owner, handoutId, from, action, statusLine }: HandoutPanelBodyProps) {
  const handout = useHandout(owner, handoutId, true)

  if (handout.data === null) {
    return <SidePanelContent kindLabel="Handout" title={null} state="not-found" />
  }
  if (handout.isError) {
    return <SidePanelContent kindLabel="Handout" title={null} state="error" onRetry={() => void handout.refetch()} />
  }
  if (handout.data === undefined) {
    return <SidePanelContent kindLabel="Handout" title={null} state="loading" />
  }

  const target = describeHandoutOwner(owner).handoutPage(handoutId)

  return (
    <SidePanelContent
      kindLabel="Handout"
      title={handout.data.title}
      state="ready"
      action={action}
      footer={
        <Link
          to={target.to}
          params={target.params as never}
          {...(from === undefined ? {} : { search: { from } })}
          className={buttonVariants({ variant: 'link', className: 'px-0' })}
        >
          Open full page
          <ArrowRight aria-hidden="true" />
        </Link>
      }
    >
      {statusLine === null || statusLine === undefined ? null : <p className="text-sm break-words text-muted-foreground">{statusLine}</p>}
      <HandoutBadges kind={handout.data.kind} visibility={handout.data.visibility} />
      <HeadingOffsetProvider value={-1}>
        <HandoutPreview owner={owner} handoutId={handoutId} />
      </HeadingOffsetProvider>
    </SidePanelContent>
  )
}
