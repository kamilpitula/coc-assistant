import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { CluesList } from '@/scene-play/components/clues-list/clues-list'
import { HeldItemsSection } from '@/scene-play/components/held-items-section/held-items-section'
import { useCluesRead } from '@/scene-play/hooks/useCluesRead'
import { UNNAMED_INVESTIGATOR } from '@/scene-play/services/revealPresentation'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'
import { buttonVariants } from '@/shared/components/ui/button'
import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'

interface CluesPanelProps {
  campaignId: string
  /** The Investigator the Keeper reads; undefined on a Player's own Clues. */
  investigatorId?: string
}

/**
 * An Investigator's Clues in the side panel (specs/navigation/ux.md section 3): the Clues list without its page h1,
 * description, or back link, one level deeper, with "Open full page" to the full Clues page. Role gating and the
 * announcement come from `useCluesRead`, but the panel announces nothing itself (G7).
 */
export function CluesPanel({ campaignId, investigatorId }: CluesPanelProps) {
  const { query, wrongRole } = useCluesRead(campaignId, investigatorId)

  if (wrongRole || query.data === null) {
    return <SidePanelContent kindLabel="Clues" title={null} state="not-found" />
  }
  if (query.isError) {
    return <SidePanelContent kindLabel="Clues" title={null} state="error" onRetry={() => void query.refetch()} />
  }
  if (query.data === undefined) {
    return <SidePanelContent kindLabel="Clues" title={null} state="loading" />
  }

  const name = query.data.investigatorName ?? UNNAMED_INVESTIGATOR
  // A Keeper in the ready state always names the Investigator; its absence is the Player's own Clues.
  const target =
    investigatorId === undefined
      ? { to: '/campaigns/$campaignId/investigator/clues', params: { campaignId } }
      : { to: '/campaigns/$campaignId/investigators/$investigatorId/clues', params: { campaignId, investigatorId } }

  return (
    <SidePanelContent
      kindLabel="Clues"
      title={`${name}'s Clues`}
      state="ready"
      footer={
        <Link to={target.to} params={target.params as never} search={{ from: 'active-scene' }} className={buttonVariants({ variant: 'link', className: 'px-0' })}>
          Open full page
          <ArrowRight aria-hidden="true" />
        </Link>
      }
    >
      <HeadingOffsetProvider value={1}>
        <HeldItemsSection campaignId={campaignId} investigatorId={investigatorId} />
        <CluesList campaignId={campaignId} clues={query.data} />
      </HeadingOffsetProvider>
    </SidePanelContent>
  )
}
