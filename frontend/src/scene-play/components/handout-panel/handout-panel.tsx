import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { HandoutBadges } from '@/scenario-preparation/components/handout-badges/handout-badges'
import { useHandout } from '@/scenario-preparation/hooks/useHandouts'
import { describeHandoutOwner, type SceneHandoutOwner } from '@/scenario-preparation/services/handoutOwner'
import { HandoutPreview } from '@/scene-play/components/handout-preview/handout-preview'
import { useActiveScene } from '@/scene-play/hooks/useActiveScene'
import { SidePanelContent } from '@/shared/components/side-panel/side-panel-content'
import { buttonVariants } from '@/shared/components/ui/button'
import { HeadingOffsetProvider } from '@/shared/providers/heading-offset/heading-offset'

interface HandoutPanelProps {
  campaignId: string
  handoutId: string
}

/**
 * A Handout's current content in the side panel (specs/navigation/ux.md section 3): its badges and preview, one level up
 * from the page so content headings start at h3. The owner is the Keeper's Active Scene; a Player or a missing Scene shows
 * not-found and sends no Handout request.
 */
export function HandoutPanel({ campaignId, handoutId }: HandoutPanelProps) {
  const active = useActiveScene(campaignId)

  if (active.data === undefined) {
    return <SidePanelContent kindLabel="Handout" title={null} state="loading" />
  }
  if (active.data?.kind !== 'keeper') {
    return <SidePanelContent kindLabel="Handout" title={null} state="not-found" />
  }

  const owner: SceneHandoutOwner = { type: 'scene', campaignId, scenarioId: active.data.scenarioId, sceneId: active.data.sceneId }
  return <HandoutBody owner={owner} handoutId={handoutId} />
}

function HandoutBody({ owner, handoutId }: { owner: SceneHandoutOwner; handoutId: string }) {
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
      footer={
        <Link
          to={target.to}
          params={target.params as never}
          search={{ from: 'active-scene' }}
          className={buttonVariants({ variant: 'link', className: 'px-0' })}
        >
          Open full page
          <ArrowRight aria-hidden="true" />
        </Link>
      }
    >
      <HandoutBadges kind={handout.data.kind} visibility={handout.data.visibility} />
      <HeadingOffsetProvider value={-1}>
        <HandoutPreview owner={owner} handoutId={handoutId} />
      </HeadingOffsetProvider>
    </SidePanelContent>
  )
}
