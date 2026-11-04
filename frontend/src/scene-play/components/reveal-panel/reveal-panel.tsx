import { RevealedContent } from '@/scene-play/components/revealed-content/revealed-content'
import { RevealMetaLine } from '@/scene-play/components/reveal-meta-line/reveal-meta-line'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'
import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'

interface RevealPanelProps {
  campaignId: string
  revealId: string
}

/**
 * What a Reveal showed in the side panel (specs/navigation/ux.md section 3): the meta line and the snapshot content, one
 * level up from the page so content headings start at h3. The Reveal comes from the Keeper's Active Scene, so a Player or a
 * missing Reveal shows not-found and sends no request. A reveal has no full page, so there is no footer.
 */
export function RevealPanel({ campaignId, revealId }: RevealPanelProps) {
  const active = useActiveScene(campaignId)

  if (active.data === undefined) {
    return <SidePanelContent kindLabel="Revealed" title={null} state="loading" />
  }

  const reveal = active.data?.kind === 'keeper' ? active.data.reveals.find((candidate) => candidate.revealId === revealId) : undefined
  if (reveal === undefined) {
    return <SidePanelContent kindLabel="Revealed" title={null} state="not-found" />
  }

  return (
    <SidePanelContent kindLabel="Revealed" title={reveal.title} state="ready">
      <HeadingOffsetProvider value={-1}>
        <RevealMetaLine reveal={reveal} />
        <RevealedContent campaignId={campaignId} reveal={reveal} />
      </HeadingOffsetProvider>
    </SidePanelContent>
  )
}
